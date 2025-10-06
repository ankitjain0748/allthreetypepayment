 const handlePaySubmit = async (e) => {
    e.preventDefault();
    const allChecked = Object.values(checkboxes).every((value) => value);
    if (!allChecked) {
      alert("Please ensure all declarations are checked before submitting.");
      return;
    }
    // if(record?.image==""){
    //   toast.error("Please upload a valid image!");
    //   return;
    // }
    setLoading(true);
    const main = new Details();
    const formdata = new FormData();
    formdata.append("amount", totalPrice);
    formdata.append("currency", "INR");
    formdata.append("receipt", "receipt#1");
    try {
      const res = await main.AddCard(formdata);
      if (res && res.data && res.data.orderId) {
        const options = {
          key: RAZOPAY_KEY,
          amount: totalPrice * 100,
          currency: "INR",
          name: "BAL VISHWA BHARTI PUBLIC SR. SEC. SCHOOL",
          description: "Payment for services",
          order_id: res.data.orderId,
          handler: function (response) {
            if (response.razorpay_payment_id) {
              toast.success("Payment Successful");
              localStorage.setItem("response", JSON.stringify(response));
              handleSubmit();
              savePaymentDetails(
                response.razorpay_order_id,
                response.razorpay_payment_id,
                "success"
              );
              Router.push(`/successform/${response.razorpay_payment_id}`);
            }
          },
          prefill: {
            name: "Customer Name",
            email: "customer@example.com",
            contact: "1234567890",
          },
          notes: {
            address: "Razorpay Corporate Office",
          },
          theme: {
            color: "#F37254",
          },
        };

        const rzp = new Razorpay(options);
        rzp.on("payment.failed", function (response) {
          const error = response.error;
          const orderId = error?.metadata?.order_id;
          const paymentId = error?.metadata?.payment_id;
          if (orderId && paymentId) {
            savePaymentDetails(orderId, paymentId, "failed");
            Router.push(`/cancel/${response.razorpay_payment_id}`);
          } else {
            console.error("Failed to retrieve Razorpay order or payment ID");
          }
        });
        rzp.open();
      } else {
        toast.error(res.data.message || "Failed to create order");
      }
    } catch (error) {
      toast.error("Error creating order");
      console.error("Order creation error:", error);
    } finally {
      setLoading(false);
    }
  };