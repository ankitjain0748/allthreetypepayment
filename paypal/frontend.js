import Listing from "@/pages/api/Listing";
import {
    PayPalScriptProvider,
    PayPalButtons,
    FUNDING,
} from "@paypal/react-paypal-js";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

function Index({
    PricePayment,
    bookingdata,
    IsBonus
}) {
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

    // console.log("IsBonus", IsBonus)
    // console.log("bookingdata", bookingdata)
    const router = useRouter();

    const [isProcessing, setIsProcessing] = useState(false);
    const [OrderId, setOrderId] = useState("");

    const handleCreateOrder = async () => {
        if (PricePayment == 0) {
            toast.error("Amount caan't be 0");
            return;
        }
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            const main = new Listing();
            const response = await main.PaypalCreate({
                amount: PricePayment,
                currency: "USD",
            });

            if (response?.data?.id) {
                const id = response.data.id;
                setOrderId(id);
                return id; // 🔥 Return it here!
            } else {
                throw new Error("No order ID returned from backend");
            }
        } catch (error) {
            console.error("API error:", error);
            toast.error(error?.response?.data?.message || "Something went wrong!");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleApprove = async (data, actions) => {
        if (PricePayment == 0) {
            toast.error("Amount caan't be 0");
            return;
        }
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            const main = new Listing();
            const response = await main.PaypalTipApprove({
                orderID: data.orderID, // or use OrderId if you prefer
                LessonId: bookingdata?.LessonId,
                teacherId: bookingdata?.teacherId,
                BookingId: bookingdata?._id,
                totalAmount: PricePayment,
                IsBonus: true
            });

            if (response?.data?.status === "COMPLETED") {
                router.push("/student/review/success");
            }
        } catch (error) {
            console.error("API error:", error);
            toast.error(error?.response?.data?.message || "Something went wrong!");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCancel = async (data, actions) => {
        if (PricePayment == 0) {
            toast.error("Amount caan't be 0");
            return;
        }
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            const main = new Listing();
            const response = await main.PaypalCancel({
                orderID: data.orderID,
                LessonId: IsBonus && IsBonus?.LessonId,
            });
            if (response?.data?.status === "CANCELLED") {
                router.push("/student/review/cancel");
            }
        } catch (error) {
            console.error("API error:", error);
            toast.error(error?.response?.data?.message || "Something went wrong!");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <PayPalScriptProvider options={{ "client-id": clientId }}>
            <div className="w-full">
                <PayPalButtons
                    createOrder={handleCreateOrder}
                    onApprove={handleApprove}
                    onCancel={handleCancel}
                    disabled={isProcessing}
                    style={{ layout: "vertical" }}
                    fundingSource={FUNDING.PAYPAL}
                />
            </div>
        </PayPalScriptProvider>
    );
}

export default Index;
