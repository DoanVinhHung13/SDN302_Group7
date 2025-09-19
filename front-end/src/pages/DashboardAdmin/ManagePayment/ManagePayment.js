import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Modal, 
  Input, 
  Select, 
  Tag, 
  Space, 
  message, 
  Card, 
  Row, 
  Col, 
  Typography,
  Divider,
  Tooltip
} from 'antd';
import { 
  DollarOutlined, 
  EyeOutlined, 
  CheckOutlined, 
  CloseOutlined,
  ReloadOutlined,
  UserOutlined,
  ShoppingCartOutlined
} from '@ant-design/icons';
import { formatCurrency } from '../../../utils/constants';
import PaymentManagementService from '../../../services/api/PaymentManagementService';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const ManagePayment = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [refundModalVisible, setRefundModalVisible] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [filterStatus, setFilterStatus] = useState('held');

  // Fetch orders for payment management
  const fetchOrders = async (page = 1, status = filterStatus) => {
    setLoading(true);
    try {
      const data = await PaymentManagementService.getOrdersForPaymentManagement({
        page,
        limit: 10,
        status
      });
      
      setOrders(data.data || []);
      setPagination({
        current: data.pagination?.page || 1,
        pageSize: data.pagination?.limit || 10,
        total: data.pagination?.total || 0
      });
    } catch (error) {
      console.error('Error fetching orders:', error);
      message.error('Lỗi khi tải danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [filterStatus]);

  // Release payment to seller
  const handleReleasePayment = async (orderId, sellerId) => {
    try {
      await PaymentManagementService.releasePaymentToSeller(orderId, sellerId);
      message.success('Chuyển tiền cho seller thành công');
      fetchOrders(pagination.current, filterStatus);
    } catch (error) {
      console.error('Error releasing payment:', error);
      message.error('Lỗi khi chuyển tiền cho seller');
    }
  };

  // Refund payment to buyer
  const handleRefundPayment = async () => {
    if (!selectedOrder || !refundReason.trim()) {
      message.error('Vui lòng nhập lý do hoàn tiền');
      return;
    }

    try {
      await PaymentManagementService.refundPaymentToBuyer(selectedOrder._id, refundReason);
      message.success('Hoàn tiền cho buyer thành công');
      setRefundModalVisible(false);
      setRefundReason('');
      setSelectedOrder(null);
      fetchOrders(pagination.current, filterStatus);
    } catch (error) {
      console.error('Error refunding payment:', error);
      message.error('Lỗi khi hoàn tiền cho buyer');
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'held': return 'orange';
      case 'released': return 'green';
      case 'refunded': return 'red';
      default: return 'default';
    }
  };

  // Get status text
  const getStatusText = (status) => {
    switch (status) {
      case 'held': return 'Đang giữ tiền';
      case 'released': return 'Đã chuyển tiền';
      case 'refunded': return 'Đã hoàn tiền';
      default: return status;
    }
  };

  // Table columns
  const columns = [
    {
      title: 'Mã đơn hàng',
      dataIndex: '_id',
      key: '_id',
      render: (id) => (
        <Text code style={{ fontSize: '12px' }}>
          {id.slice(-8)}
        </Text>
      ),
    },
    {
      title: 'Người mua',
      dataIndex: 'buyerId',
      key: 'buyerId',
      render: (buyer) => (
        <div>
          <div><UserOutlined /> {buyer?.username}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {buyer?.email}
          </Text>
        </div>
      ),
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'totalPrice',
      key: 'totalPrice',
      render: (price) => (
        <Text strong style={{ color: '#1890ff' }}>
          {formatCurrency(price)}
        </Text>
      ),
    },
    {
      title: 'Ngày đặt',
      dataIndex: 'orderDate',
      key: 'orderDate',
      render: (date) => new Date(date).toLocaleDateString('vi-VN'),
    },
    {
      title: 'Trạng thái thanh toán',
      dataIndex: 'paymentStatus',
      key: 'paymentStatus',
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      ),
    },
    {
      title: 'Số seller',
      key: 'sellerCount',
      render: (_, record) => (
        <Tag icon={<ShoppingCartOutlined />}>
          {record.sellerAmounts?.length || 0} seller
        </Tag>
      ),
    },
    {
      title: 'Hành động',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="Xem chi tiết">
            <Button
              type="primary"
              icon={<EyeOutlined />}
              size="small"
              onClick={() => {
                setSelectedOrder(record);
                setDetailModalVisible(true);
              }}
            />
          </Tooltip>
          {record.paymentStatus === 'held' && (
            <>
              <Tooltip title="Hoàn tiền">
                <Button
                  type="default"
                  danger
                  icon={<CloseOutlined />}
                  size="small"
                  onClick={() => {
                    setSelectedOrder(record);
                    setRefundModalVisible(true);
                  }}
                />
              </Tooltip>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
          <Col>
            <Title level={3} style={{ margin: 0 }}>
              <DollarOutlined /> Quản lý thanh toán
            </Title>
            <Text type="secondary">
              Quản lý việc chuyển tiền cho seller và hoàn tiền cho buyer
            </Text>
          </Col>
          <Col>
            <Space>
              <Select
                value={filterStatus}
                onChange={(value) => {
                  setFilterStatus(value);
                  setPagination(prev => ({ ...prev, current: 1 }));
                }}
                style={{ width: 150 }}
              >
                <Option value="held">Đang giữ tiền</Option>
                <Option value="released">Đã chuyển tiền</Option>
                <Option value="refunded">Đã hoàn tiền</Option>
              </Select>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => fetchOrders(pagination.current, filterStatus)}
                loading={loading}
              >
                Làm mới
              </Button>
            </Space>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={orders}
          rowKey="_id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} của ${total} đơn hàng`,
            onChange: (page, pageSize) => {
              setPagination(prev => ({ ...prev, current: page, pageSize }));
              fetchOrders(page, filterStatus);
            },
          }}
        />
      </Card>

      {/* Order Detail Modal */}
      <Modal
        title="Chi tiết đơn hàng"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedOrder && (
          <div>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Card size="small" title="Thông tin đơn hàng">
                  <p><strong>Mã đơn hàng:</strong> {selectedOrder._id}</p>
                  <p><strong>Người mua:</strong> {selectedOrder.buyerId?.username}</p>
                  <p><strong>Email:</strong> {selectedOrder.buyerId?.email}</p>
                  <p><strong>Tổng tiền:</strong> {formatCurrency(selectedOrder.totalPrice)}</p>
                  <p><strong>Ngày đặt:</strong> {new Date(selectedOrder.orderDate).toLocaleString('vi-VN')}</p>
                  <p><strong>Trạng thái:</strong> 
                    <Tag color={getStatusColor(selectedOrder.paymentStatus)} style={{ marginLeft: '8px' }}>
                      {getStatusText(selectedOrder.paymentStatus)}
                    </Tag>
                  </p>
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" title="Địa chỉ giao hàng">
                  {selectedOrder.addressId && (
                    <div>
                      <p><strong>Tên:</strong> {selectedOrder.addressId.fullName}</p>
                      <p><strong>SĐT:</strong> {selectedOrder.addressId.phoneNumber}</p>
                      <p><strong>Địa chỉ:</strong> {selectedOrder.addressId.address}</p>
                      <p><strong>Tỉnh/TP:</strong> {selectedOrder.addressId.city}</p>
                    </div>
                  )}
                </Card>
              </Col>
            </Row>

            <Divider />

            <Card size="small" title="Danh sách seller và sản phẩm">
              {selectedOrder.sellerAmounts?.map((sellerData, index) => (
                <div key={index} style={{ marginBottom: '16px', padding: '12px', border: '1px solid #f0f0f0', borderRadius: '6px' }}>
                  <Row justify="space-between" align="middle">
                    <Col>
                      <Title level={5} style={{ margin: 0 }}>
                        <UserOutlined /> {sellerData.seller.username}
                      </Title>
                      <Text type="secondary">{sellerData.seller.email}</Text>
                    </Col>
                    <Col>
                      <Text strong style={{ color: '#1890ff', fontSize: '16px' }}>
                        {formatCurrency(sellerData.amount)}
                      </Text>
                    </Col>
                    <Col>
                      {selectedOrder.paymentStatus === 'held' && (
                        <Button
                          type="primary"
                          icon={<CheckOutlined />}
                          onClick={() => handleReleasePayment(selectedOrder._id, sellerData.seller._id)}
                        >
                          Chuyển tiền
                        </Button>
                      )}
                    </Col>
                  </Row>
                  
                  <Divider style={{ margin: '12px 0' }} />
                  
                  <div>
                    <Text strong>Sản phẩm:</Text>
                    {sellerData.items.map((item, itemIndex) => (
                      <div key={itemIndex} style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fafafa', borderRadius: '4px' }}>
                        <Row justify="space-between">
                          <Col span={16}>
                            <Text>{item.product.title}</Text>
                            <br />
                            <Text type="secondary">Giá: {formatCurrency(item.unitPrice)}</Text>
                          </Col>
                          <Col span={8} style={{ textAlign: 'right' }}>
                            <Text>Số lượng: {item.quantity}</Text>
                            <br />
                            <Text strong>Thành tiền: {formatCurrency(item.quantity * item.unitPrice)}</Text>
                          </Col>
                        </Row>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </Card>
          </div>
        )}
      </Modal>

      {/* Refund Modal */}
      <Modal
        title="Hoàn tiền cho buyer"
        open={refundModalVisible}
        onOk={handleRefundPayment}
        onCancel={() => {
          setRefundModalVisible(false);
          setRefundReason('');
          setSelectedOrder(null);
        }}
        okText="Xác nhận hoàn tiền"
        cancelText="Hủy"
      >
        {selectedOrder && (
          <div>
            <p><strong>Đơn hàng:</strong> {selectedOrder._id}</p>
            <p><strong>Người mua:</strong> {selectedOrder.buyerId?.username}</p>
            <p><strong>Số tiền hoàn:</strong> {formatCurrency(selectedOrder.totalPrice)}</p>
            <Divider />
            <div>
              <Text strong>Lý do hoàn tiền:</Text>
              <TextArea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Nhập lý do hoàn tiền..."
                rows={4}
                style={{ marginTop: '8px' }}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ManagePayment;
