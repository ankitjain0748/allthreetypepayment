const clientId = process.env.PAYPAL_CLIENT_ID;
const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
const paypalApiUrl = process.env.PAYPAL_API;

const generateAccessToken = async () => {
  try {
    const auth = Buffer.from(
      `${clientId}:${clientSecret}`
    ).toString('base64');
    const response = await axios.post(
      `${paypalApiUrl}/v1/oauth2/token`,
      qs.stringify({
        grant_type: 'client_credentials',
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${auth}`,
        },
      }
    );
    return response.data.access_token;
  } catch (error) {
    console.error("PayPal Token Error:", error.response?.data || error.message);
  }
};

exports.createOrder = catchAsync(async (req, res) => {
  try {
    const { amount, currency, } = req.body
    const accessToken = await generateAccessToken();
    const paypalApiUrl = process.env.PAYPAL_API;
    const orderData = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: currency,
            value: amount,
          },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            payment_method_preference: "IMMEDIATE_PAYMENT_REQUIRED",
            payment_method_selected: "PAYPAL",
            brand_name: "DekayHub - Volatility Grid",
            shipping_preference: "NO_SHIPPING",
            locale: "en-US",
            user_action: "PAY_NOW",
          },
        },
      },
    };

    const response = await axios.post(
      `${paypalApiUrl}/v2/checkout/orders`,
      orderData,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    res.status(201).json(response.data);
  } catch (error) {
    console.error('Error in createOrder controller:', error);
    res.status(500).json({ error: 'Failed to create PayPal order' });
  }
}
);


exports.PaymentcaptureOrder = catchAsync(async (req, res) => {
  try {
    const UserId = req.user.id;
    const { orderID, teacherId, startDateTime, endDateTime, LessonId, timezone, totalAmount, adminCommission, email,
      isSpecialSlot, processingFee
    } = req.body;

    const accessToken = await generateAccessToken();
    const response = await axios.post(
      `${paypalApiUrl}/v2/checkout/orders/${orderID}/capture`,
      {},
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    const captureData = response.data;

    //Payment Table Save 
  } catch (error) {
    console.error(" Error capturing PayPal order:", error?.response?.data || error.message);
    res.status(500).json({ error: "Failed to capture and save PayPal order" });
  }
});



exports.PaymentcancelOrder = catchAsync(async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderID, LessonId } = req.body;

    if (!orderID) {
      return res.status(400).json({ error: "orderID is required" });
    }

    const accessToken = await generateAccessToken();
    try {
      const voidResponse = await axios.post(
        `${paypalApiUrl}/v2/checkout/orders/${orderID}/void`,
        {},
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
    } catch (paypalErr) {
      console.warn("Could not void PayPal order (maybe already captured?):", paypalErr.response?.data || paypalErr.message);
    }
    res.status(200).json({ status: "CANCELLED", message: "Order cancelled successfully" });
  } catch (error) {
    console.error("Error saving cancelled order:", error.message);
    res.status(500).json({ error: "Failed to cancel order" });
  }
}
);