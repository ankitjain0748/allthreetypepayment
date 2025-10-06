const Razorpay = require("razorpay");
const crypto = require("crypto");


// Razorpay instance
const razorpay = new Razorpay({
  key_id: "Api key",    // aapka Key ID
  key_secret: "key_secret",   // aapka Secret Key
});

app.post("/create-order", async (req, res) => {
  const options = {
    amount: 50000, // ₹500 in paise
    currency: "INR",
    receipt: "receipt#1",
  };

  try {
    const order = await razorpay.orders.create(options);
    console.log("order", order)
    res.json(order);
  } catch (err) {
    console.log(err)
    res.status(500).send(err);
  }
});


//Payment Webhook
// Only for Razorpay webhook route, use raw body
app.use("/api/webhook/razorpay", express.raw({ type: "*/*" }));

app.post("/api/webhook/razorpay", (req, res) => {
  const secret = "webhook Key genrate itslef";

  // req.body is a Buffer
  const webhookBody = req.body.toString("utf-8"); // convert Buffer -> string
  const signature = req.headers["x-razorpay-signature"];

  // Generate expected signature
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(webhookBody)
    .digest("hex");

  if (expectedSignature === signature) {
    console.log("✅ Webhook verified successfully!");

    const payload = JSON.parse(webhookBody);
    const event = payload.event;

    switch (event) {
      case "payment.captured":
        console.log("💰 Payment captured:", payload.payload.payment.entity);
        break;
      case "payment.failed":
        console.log("❌ Payment failed:", payload.payload.payment.entity);
        break;
      case "order.paid":
        console.log("📦 Order Paid:", payload.payload.order.entity);
        break;
      default:
        console.log("⚠️ Unhandled event:", event);
    }

    res.status(200).json({ status: "ok" });
  } else {
    console.log("❌ Invalid signature. Possible tampering!");
    res.status(400).send("Invalid signature");
  }
});
