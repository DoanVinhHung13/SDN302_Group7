// src/pages/AuthCallback.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setCredentials } from "../features/auth/authSlice";
import { jwtDecode} from "jwt-decode";

const AuthCallback = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (token) {
      const decoded = jwtDecode(token);
      dispatch(setCredentials({
        user: { id: decoded.id, role: decoded.role },
        token,
      }));
      navigate("/", { replace: true });
      
    } else {
      navigate("/signin?error=GoogleLoginFailed");
    }
  }, [dispatch, navigate]);

  return <p>Đang đăng nhập bằng Google...</p>;
};

export default AuthCallback;
