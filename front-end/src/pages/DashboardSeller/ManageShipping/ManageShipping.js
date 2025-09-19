import { ReloadOutlined } from "@ant-design/icons";
import { Button, message, Modal, Select, Space, Table, Tag } from "antd";
import axios from "axios";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import Title from "../Title";

const { Option } = Select;

const statusColors = {
  pending: "orange",
  shipping: "blue",
  shipped: "green",
  "failed to ship": "red",
  rejected: "red",
  processing: "gold",
};

const ManageShipping = () => {
  const token = useSelector((state) => state.auth.token);
  const [loading, setLoading] = useState(false);
  const [shipments, setShipments] = useState([]);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [confirmShippedVisible, setConfirmShippedVisible] = useState(false);

  // Fetch shipping data
  const fetchShippingData = async () => {
    try {
      setLoading(true);
      const baseURL = process.env.REACT_APP_API_URL || "http://localhost:9999";
      console.log(
        "Fetching shipping data from:",
        `${baseURL}/api/seller/shipping`
      );

      const response = await axios.get(`${baseURL}/api/seller/shipping`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("Shipping API response:", response.data);

      if (response.data.success) {
        setShipments(response.data.data);
      } else {
        message.error(
          response.data.message || "Failed to load shipping information"
        );
      }
    } catch (error) {
      console.error("Error fetching shipping data:", error.response || error);
      message.error(
        "Failed to load shipping information. Please check the console for details."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchShippingData();
    } else {
      console.error("No authentication token available");
      message.error("Please log in to access shipping information");
    }
  }, [token]);

  // Handle status update button click
  const handleUpdateClick = () => {
    if (selectedStatus === "shipped") {
      setConfirmShippedVisible(true);
    } else {
      updateShippingStatus();
    }
  };

  // Update shipping status
  const updateShippingStatus = async () => {
    if (!selectedShipment || !selectedStatus) return;

    try {
      setLoading(true);
      const baseURL = process.env.REACT_APP_API_URL || "http://localhost:9999";

      // Use orderItem._id since shippingInfo might be null
      const shippingId =
        selectedShipment.shippingInfo?._id || selectedShipment.orderItem._id;

      const response = await axios.put(
        `${baseURL}/api/seller/shipping/${shippingId}/status`,
        { status: selectedStatus },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        message.success("Shipping status updated successfully");
        setStatusModalVisible(false);
        setConfirmShippedVisible(false);
        fetchShippingData(); // Refresh data
      } else {
        message.error(response.data.message || "Failed to update status");
      }
    } catch (error) {
      console.error("Error updating shipping status:", error.response || error);
      message.error("Failed to update shipping status");
    } finally {
      setLoading(false);
    }
  };

  // Open status update modal
  const showStatusModal = (record) => {
    setSelectedShipment(record);
    // Use orderItem status if shippingInfo is null
    setSelectedStatus(
      record.shippingInfo?.status || record.orderItem?.status || "shipping"
    );
    setStatusModalVisible(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getStatusBadge = (status) => (
    <Tag color={statusColors[status] || "default"}>
      {status?.toUpperCase() || "UNKNOWN"}
    </Tag>
  );

  // Table columns - updated to match actual API response
  const columns = [
    {
      title: "Order ID",
      dataIndex: ["orderItem", "orderId"],
      key: "orderId",
      render: (orderId) =>
        orderId?._id ? orderId._id.substring(0, 8) + "..." : "N/A",
    },
    {
      title: "Product",
      dataIndex: ["orderItem", "productId"],
      key: "product",
      render: (product) => (
        <div className="flex items-center">
          {product?.image && (
            <img
              src={product.image}
              alt={product.title}
              className="w-12 h-12 object-cover mr-2 rounded"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "https://via.placeholder.com/100";
              }}
            />
          )}
          <div>
            <div className="font-medium">{product?.title || "N/A"}</div>
            <div className="text-xs text-gray-500">
              {product?.categoryId?.name || ""}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Buyer",
      dataIndex: ["orderItem", "orderId", "buyerId"],
      key: "buyer",
      render: (buyer) => (
        <div>
          <div className="font-medium">
            {buyer?.fullname || buyer?.username || "N/A"}
          </div>
          <div className="text-xs text-gray-500">{buyer?.email || ""}</div>
        </div>
      ),
    },
    {
      title: "Shipping Address",
      dataIndex: ["orderItem", "orderId", "addressId"],
      key: "address",
      render: (address) => (
        <div className="text-xs">
          <div className="font-medium">{address?.fullName || "N/A"}</div>
          <div>{address?.phone || ""}</div>
          <div>{`${address?.street || ""}, ${address?.city || ""}, ${
            address?.state || ""
          }`}</div>
          <div>{address?.country || ""}</div>
        </div>
      ),
    },
    {
      title: "Quantity",
      dataIndex: ["orderItem", "quantity"],
      key: "quantity",
    },
    {
      title: "Unit Price",
      dataIndex: ["orderItem", "unitPrice"],
      key: "unitPrice",
      render: (price) => `$${price?.toLocaleString() || 0}`,
    },
    {
      title: "Total Price",
      dataIndex: ["orderItem", "orderId", "totalPrice"],
      key: "totalPrice",
      render: (price) => `$${price?.toLocaleString() || 0}`,
    },
    {
      title: "Order Status",
      dataIndex: ["orderItem", "orderId", "status"],
      key: "orderStatus",
      render: (status) => getStatusBadge(status),
    },
    {
      title: "Payment Status",
      dataIndex: ["orderItem", "orderId", "paymentStatus"],
      key: "paymentStatus",
      render: (status) => getStatusBadge(status),
    },
    {
      title: "Shipping Status",
      key: "shippingStatus",
      render: (_, record) => {
        // Use shippingInfo status if available, otherwise use orderItem status
        const status = record.shippingInfo?.status || record.orderItem?.status;
        return getStatusBadge(status);
      },
    },
    {
      title: "Order Date",
      dataIndex: ["orderItem", "orderId", "orderDate"],
      key: "orderDate",
      render: (date) => formatDate(date),
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) => {
        const currentStatus =
          record.shippingInfo?.status || record.orderItem?.status;
        const isCompleted = currentStatus === "shipped";

        return (
          <Space>
            <Button
              type={isCompleted ? "default" : "primary"}
              size="small"
              ghost={!isCompleted}
              disabled={isCompleted}
              onClick={() => showStatusModal(record)}
            >
              {isCompleted ? "Completed" : "Update Status"}
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <div className="w-full">
      <div className="w-full flex flex-col gap-4">
        <div className="w-full flex flex-row justify-between">
          <Title
            title="Shipping Management"
            subtitle="Manage order shipping and delivery status"
          />
          <Button
            type="default"
            icon={<ReloadOutlined />}
            onClick={fetchShippingData}
            loading={loading}
          >
            Refresh
          </Button>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <Table
            dataSource={shipments}
            columns={columns}
            rowKey={(record) => record.orderItem?._id}
            loading={loading}
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              total: shipments.length,
              onChange: (page) => setCurrentPage(page),
              onShowSizeChange: (_, size) => setPageSize(size),
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} items`,
            }}
            scroll={{ x: 1200 }} // Add horizontal scroll for better mobile experience
          />
        </div>
      </div>

      {/* Status Update Modal */}
      <Modal
        title="Update Shipping Status"
        open={statusModalVisible}
        onCancel={() => setStatusModalVisible(false)}
        footer={[
          <Button
            key="cancel"
            type="default"
            onClick={() => setStatusModalVisible(false)}
          >
            Cancel
          </Button>,
          <Button
            key="submit"
            type={selectedStatus === "shipped" ? "default" : "primary"}
            ghost={selectedStatus !== "shipped"}
            loading={loading}
            onClick={handleUpdateClick}
          >
            {selectedStatus === "shipped"
              ? "Complete Shipping"
              : "Update Status"}
          </Button>,
        ]}
      >
        <div className="mb-4">
          <p>
            <strong>Order ID:</strong>{" "}
            {selectedShipment?.orderItem?.orderId?._id || "N/A"}
          </p>
          <p>
            <strong>Product:</strong>{" "}
            {selectedShipment?.orderItem?.productId?.title || "N/A"}
          </p>
          <p>
            <strong>Current Status:</strong>{" "}
            {getStatusBadge(
              selectedShipment?.shippingInfo?.status ||
                selectedShipment?.orderItem?.status
            )}
          </p>
        </div>
        <div>
          <label className="block mb-2">New Status:</label>
          <Select
            value={selectedStatus}
            onChange={(value) => setSelectedStatus(value)}
            style={{ width: "100%" }}
          >
            <Option value="pending">PENDING</Option>
            <Option value="shipping">SHIPPING</Option>
            <Option value="shipped">SHIPPED</Option>
            <Option value="failed to ship">FAILED TO SHIP</Option>
          </Select>
        </div>
      </Modal>

      {/* Confirmation Modal for Shipped Status */}
      <Modal
        title="Confirm Final Status Update"
        open={confirmShippedVisible}
        onCancel={() => setConfirmShippedVisible(false)}
        footer={[
          <Button
            key="cancel"
            type="default"
            onClick={() => setConfirmShippedVisible(false)}
          >
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={loading}
            onClick={updateShippingStatus}
          >
            Confirm as Shipped
          </Button>,
        ]}
      >
        <div className="text-red-500 font-medium mb-4">
          Warning: This action cannot be undone!
        </div>
        <p>
          You are about to mark this shipment as <strong>SHIPPED</strong>. Once
          updated, the status cannot be changed again. Are you sure you want to
          proceed?
        </p>
      </Modal>
    </div>
  );
};

export default ManageShipping;
