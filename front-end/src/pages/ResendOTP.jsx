// src/components/ResendOTP.jsx
import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const ResendOTP = ({ email, onResend }) => {
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Timer cooldown
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleResendOTP = async () => {
    if (!email || resendCooldown > 0) return;

    setResendLoading(true);
    try {
      const res = await axios.post("http://localhost:9999/api/resend-otp", { email });

      console.log("Resend response:", res.data); // debug
      if (res.data.success) {
        toast.success(res.data.message || "OTP mới đã được gửi tới email của bạn");
        setResendCooldown(30); // cooldown 30s
        onResend && onResend(); // callback để reset OTP inputs
      } else {
        toast.error(res.data.message || "Gửi lại OTP thất bại");
      }
    } catch (err) {
      console.error("Resend error:", err.response?.data);
      toast.error(err.response?.data?.message || "Gửi lại OTP thất bại");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleResendOTP}
      disabled={resendLoading || resendCooldown > 0}
      className={`w-full py-3 px-4 mt-2 text-sm font-medium rounded-lg text-[#0F52BA] border border-[#0F52BA] hover:bg-[#0F52BA] hover:text-white transition-all duration-200 ${
        resendLoading || resendCooldown > 0 ? "opacity-70 cursor-not-allowed" : ""
      }`}
    >
      {resendLoading
        ? "Đang gửi lại..."
        : resendCooldown > 0
        ? `Gửi lại OTP (${resendCooldown}s)`
        : "Gửi lại OTP"}
    </button>
  );
};

export default ResendOTP;
