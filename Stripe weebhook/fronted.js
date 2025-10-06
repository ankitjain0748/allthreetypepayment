import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/router';
import { loadStripe } from '@stripe/stripe-js';
import {
    Elements,
    CardElement,
    useStripe,
    useElements
} from '@stripe/react-stripe-js';
import Listing from '@/pages/api/Listing';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

function StripeForm({
    PricePayment,
    bookingdata,
    IsBonus }) {
    const stripe = useStripe();
    const elements = useElements();
    const [processing, setProcessing] = useState(false);
    const [message, setMessage] = useState(null);
    const router = useRouter()


    const handlePayment = async () => {
        if(PricePayment == 0){
            toast.error("Amount caan't be 0");
            return;
        }
        if (processing || !stripe || !elements) return;
        try {
            setProcessing(true);
            const payment = new Listing();
            const res = await payment.Stripe_payment({
                amount: PricePayment,
                currency: "USD",
                LessonId: bookingdata?.LessonId,
                teacherId: bookingdata?.teacherId,
                BookingId: bookingdata?._id,
                IsBonus: IsBonus
            });
            const clientSecret = res?.data?.clientSecret;
            const cardElement = elements.getElement(CardElement);
            const paymentResult = await stripe.confirmCardPayment(clientSecret, {
                payment_method: {
                    card: cardElement,
                },
            });

            if (paymentResult.error) {
                setMessage(paymentResult.error.message);
                router.push("/cancel");
                toast.error(paymentResult.error.message);
            } else if (paymentResult.paymentIntent.status === 'succeeded') {
                router.push("/success");
                setMessage('✅ Payment successful! Thank you.');
                toast.success("Payment successful!");
            }

        } catch (err) {
            console.error("Payment error:", err);
            toast.error("Error during payment");
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="p-4 space-y-4 border rounded-lg">
            <CardElement className="p-2 border rounded-md" />
            <button
                className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 rounded-full cursor-pointer"
                onClick={handlePayment}
                disabled={processing || !stripe || !elements}
            >
                {processing ? "Processing..." : `Pay ${PricePayment ? `$${PricePayment}` : ""} USD`}
            </button>
            {message && <p className="text-sm text-gray-700">{message}</p>}
        </div>
    );
}

export default function StripeTips(props) {
    return (
        <Elements stripe={stripePromise}>
            <StripeForm {...props} />
        </Elements>
    );
}



exports.PaymentCreate = catchAsync(async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, LessonId, currency, teacherId,
      startDateTime, endDateTime, timezone, adminCommission,
      email, isSpecial, IsBonus,
      BookingId, processingFee
    } = req?.body;
    // console.log("req?.body", req?.body)

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: currency,
      payment_method_types: ['card'],
      metadata: {
        userId,
        LessonId,
        teacherId,
        startDateTime,
        endDateTime,
        timezone,
        adminCommission,
        email,
        amount,
        currency,
        srNo: srNo.toString(),
        isSpecial,
        BookingId,
        IsBonus,
        processingFee,
      }
    });
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


//Api Crewate  Payment 



// Stripe Checkout Sytem 
// const fetchPaymentId = async (sessionId, srNo) => {
//   try {
//     const session = await stripe.checkout.sessions.retrieve(sessionId);
//     const paymentId = session.payment_intent;
//     if (!srNo) {
//       return;
//     }
//     const data = await StripePayment.findOne({ srNo: srNo });
//     if (!data) {
//       return null;
//     }
//     data.payment_id = paymentId;
//     await data.save();
//     return paymentId;
//   } catch (error) {
//     console.error("Error fetching payment ID:", error);
//     logger.error("Error fetching payment ID:", error);
//     return null;
//   }
// };


// exports.createCheckout = catchAsync(async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { amount, LessonId, currency, teacherId, startDateTime, endDateTime, timezone, adminCommission, email } = req?.body;
//     const lastpayment = await StripePayment.findOne().sort({ srNo: -1 });
//     const srNo = lastpayment ? lastpayment.srNo + 1 : 1;
//     const amountInCents = Math.round(amount * 100);
//     const session = await stripe.checkout.sessions.create({
//       payment_method_types: ['card'],
//       mode: 'payment', // Correct mode value
//       // success_url: `${process.env.stripe_link}/stripe/success/${srNo}`,
//       success_url: `https://japaneseforme.com/stripe/success/${srNo}`,
//       // cancel_url: `${process.env.stripe_link}/stripe/cancel/${srNo}`,
//       cancel_url: `https://japaneseforme.com/stripe/cancel/${srNo}`,
//       submit_type: "pay",
//       customer_email: email || "ankitjain@gmail.com",
//       billing_address_collection: "auto",
//       line_items: [
//         {
//           price_data: {
//             currency: currency,
//             product_data: {
//               name: "Booking Payment",
//             },
//             unit_amount: amountInCents,
//           },
//           quantity: 1,
//         },
//       ],
//     });


//     const newPayment = new StripePayment({
//       srNo,
//       payment_type: "card",
//       payment_id: null,
//       session_id: session?.id,
//       currency,
//       LessonId,
//       amount,
//       srNo,
//       UserId: userId
//     });
//     const record = await newPayment.save();

//     // Convert times from user's timezone to UTC
//     const startUTC = DateTime.fromISO(startDateTime, { zone: timezone }).toUTC().toJSDate();
//     const endUTC = DateTime.fromISO(endDateTime, { zone: timezone }).toUTC().toJSDate();

//     const teacherEarning = amount - adminCommission;
//     const Bookingsave = new Bookings({
//       teacherId,
//       UserId: userId,
//       teacherEarning,
//       adminCommission,
//       LessonId,
//       StripepaymentId: record?._id,
//       startDateTime: startUTC,
//       endDateTime: endUTC,
//       currency,
//       totalAmount: amount,
//       srNo
//     });
//     await Bookingsave.save();
//     const user = await User.findById({ _id: req.user.id });
//     const registrationSubject = "Booking Confirmed 🎉";
//     const Username = user.name
//     const emailHtml = BookingSuccess(startUTC, Username);
//     await sendEmail({
//       email: email,
//       subject: registrationSubject,
//       emailHtml: emailHtml,
//     });
//     res.status(200).json({ url: session.url, status: "true" });
//   } catch (err) {
//     res.status(err.statusCode || 500).json({ error: err.message });
//   }
// });


// exports.PaymentSuccess = catchAsync(async (req, res) => {
//   try {
//     const { srNo } = req.params;
//     if (!srNo) {
//       return res.status(400).json({
//         message: "srNo is required.",
//         status: false,
//       });
//     }
//     const data = await StripePayment.findOne({ srNo: srNo });
//     if (!data) {
//       return res.status(404).json({
//         message: "Data not found",
//         status: false,
//       });
//     }
//     data.payment_status = "success";
//     await data.save();
//     const Payment_ID = await fetchPaymentId(data?.session_id, srNo, "success");
//     res.status(200).json({
//       message: `Payment status updated`,
//       status: true,
//       data: data,
//     });
//   } catch (error) {
//     console.error("Error updating booking status:", error);
//     logger.error("Error updating booking status:", error);
//     res.status(500).json({
//       message: "Internal Server Error",
//       status: false,
//     });
//   }
// });


// exports.PaymentCancel = catchAsync(async (req, res) => {
//   try {
//     const { srNo } = req.params;
//     if (!srNo) {
//       return res.status(400).json({
//         message: "srNo is required.",
//         status: false,
//       });
//     }
//     const data = await StripePayment.findOne({ srNo: srNo });
//     if (!data) {
//       return res.status(404).json({
//         message: "Data not found",
//         status: false,
//       });
//     }
//     data.payment_status = "failed";
//     await data.save();
//     fetchPaymentId(data?.session_id, srNo, "cancel");
//     res.status(200).json({
//       message: `Payment status updated`,
//       status: true,
//       data: data,
//     });
//   } catch (error) {
//     console.error("Error updating booking status:", error);
//     logger.error("Error updating booking status:", error);
//     res.status(500).json({
//       message: "Internal Server Error",
//       status: false,
//     });
//   }
// });


// exports.createpayment = async (req, res) => {
//   try {
//     const { amount = 2000, currency = 'usd' } = req.body;
//     const paymentIntent = await stripe.paymentIntents.create({
//       amount,
//       currency,
//       metadata: req.body.metadata || {},
//     });
//     console.log("paymentIntent", paymentIntent)
//     return res.json({ clientSecret: paymentIntent.client_secret });;
//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({ error: err.message });
//   }
// }
