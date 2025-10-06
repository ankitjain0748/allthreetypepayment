const Razorpay = require('razorpay');
require('dotenv').config();

const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

exports.createOrder = async (req, res) => {
    const { amount, currency = 'INR', receipt } = req.body;
    try {
        const options = {
            amount: amount * 100,
            currency,
            receipt,
            payment_capture: 1,
        };

        const order = await razorpayInstance.orders.create(options);

        res.status(200).json({
            success: true,
            orderId: order.id,
            currency: order.currency,
            amount: order.amount,
        });
    } catch (error) {
        console.error('Order creation error:', error);
        res.status(500).json({ success: false, message: 'Order creation failed', error: error.message });
    }
};

exports.paymentAdd = catchAsync(async (req, res) => {
    console.log("req", req?.body);
    const { order_id, payment_id, amount, currency, payment_status, product_name, type } = req.body;
    const status = payment_status === 'failed' ? 'failed' : 'success';

    await payment.save();
    if (payment_status === 'failed') {
        return res.status(200).json({ status: 'failed', message: 'Payment failed and saved successfully' });
    } else {
        return res.status(200).json({ status: 'success', message: 'Payment verified and saved successfully' });
    }
});