import { createSlice } from '@reduxjs/toolkit';
import  {jwtDecode } from 'jwt-decode';

// Hàm lấy state ban đầu
const getInitialState = () => {
  try {
    const token = localStorage.getItem('token');
    if (token) {
      const decoded = jwtDecode(token);
      return {
        user: {
          id: decoded.id,
          username: decoded.username,
          role: decoded.role,
        },
        token,
        isAuthenticated: true
      };
    }
  } catch (error) {
    console.error("Lỗi giải mã token:", error);
  }
  
  // Trả về state mặc định nếu có lỗi
  return {
    user: null,
    token: null,
    isAuthenticated: false
  };
};

const authSlice = createSlice({
  name: 'auth',
  initialState: getInitialState(),
  reducers: {
    setCredentials: (state, action) => {
      const { user, token } = action.payload;
      state.user = user;
      state.token = token;
      state.isAuthenticated = true;
      localStorage.setItem('token', token);
      localStorage.setItem('accessToken', token);
    },
    logout: (state) => {
      // Xác nhận trước khi logout
      const confirmLogout = window.confirm("Bạn có chắc chắn muốn đăng xuất không?");
      if (!confirmLogout) {
        return; // Người dùng hủy, không làm gì
      }

      // Thực hiện logout nếu đồng ý
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem('token');
      localStorage.removeItem('accessToken');
    }
  }
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
