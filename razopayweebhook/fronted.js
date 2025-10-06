import React, { useEffect } from "react";

const PaymentPage = () => {
  const RAZORPAY_KEY = "Api Key" ;

  useEffect(() => {
    // Load Razorpay checkout script
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handlePayment = async () => {
    try {
      const response = await fetch(
        "https://b38cb36fbfe9.ngrok-free.app/create-order",
        { method: "POST" }
      );
      const orderData = await response.json();

      const options = {
        key: RAZORPAY_KEY,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.id,
        name: "My Test Store",
        description: "Test Payment",
        handler: function (response) {
          console.log("✅ Payment Success:", response);
          alert("Payment Successful! Payment ID: " + response.razorpay_payment_id);
        },
        prefill: { name: "John Doe", email: "john@example.com" },
        theme: { color: "#3399cc" },
      };

      const rzp = new window.Razorpay(options); // ✅ Use window.Razorpay
      rzp.open();
    } catch (err) {
      console.error("❌ Payment error:", err);
      alert("Payment failed! Check console.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <h1 className="text-2xl font-bold mb-6">Razorpay Payment Page</h1>
      <button
        onClick={handlePayment}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
      >
        Pay ₹500
      </button>
    </div>
  );
};

export default PaymentPage;
