import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:9999';

class OrderService {
  // Tạo đơn hàng với PayPal trong một bước
  static async createOrderWithPayPal(orderData) {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/buyers/orders/paypal`,
        orderData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error creating order with PayPal:', error);
      throw error;
    }
  }

  // Tạo đơn hàng thông thường (không thanh toán)
  static async createOrder(orderData) {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/buyers/orders`,
        orderData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  // Lấy danh sách đơn hàng của buyer
  static async getBuyerOrders(params = {}) {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/api/buyers/orders`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          params
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching buyer orders:', error);
      throw error;
    }
  }

  // Lấy chi tiết đơn hàng
  static async getOrderDetails(orderId) {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/api/buyers/orders/${orderId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching order details:', error);
      throw error;
    }
  }
}

export default OrderService;