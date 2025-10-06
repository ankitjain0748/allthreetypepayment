app.post(
  "/api/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    Loggers.info("Headers received:", req.headers);
    const sig = req.headers["stripe-signature"];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      Loggers.error(`❌ Webhook signature verification failed: ${err.message}`);
      return res.status(400).json(`Webhook Error: ${err.message}`);
    }

    Loggers.silly(`✅ Webhook event received: ${event.type}`);
    // Handle event
    switch (event.type) {
      case "charge.succeeded": {
        const charge = event.data.object;
        Loggers.warn(`💰 Charge succeeded for amount: ${charge.amount}`);
        break;
      }

      case "charge.failed": {
        const charge = event.data.object;
        Loggers.debug(`❌ Charge failed: ${charge.failure_message}`);
        break;
      }

      case "payment_intent.created": {
        const pi = event.data.object;
        Loggers.silly(`🕐 PaymentIntent created: ${pi.id}`);
        break;
      }

      case "payment_intent.payment_failed": {
        const pi = event.data.object;
        Loggers.debug(
          `❌ PaymentIntent failed: ${pi.last_payment_error?.message}`
        );
        break;
      }

      case "payment_intent.succeeded": {
        const pi = event.data.object;
        Loggers.info(`✅ PaymentIntent succeeded for amount: ${pi.amount}`);
        const metadata = pi.metadata;
        if (metadata.IsBonus) {
          const payment = await StripePayment.create({
            srNo: parseInt(metadata.srNo),
            payment_type: "card",
            payment_id: pi.id,
            currency: pi.currency,
            LessonId: metadata.LessonId,
            amount: pi.amount / 100,
            UserId: metadata.userId,
            payment_status: pi.status,
            IsBonus: true,
          });
          // Create Bonus record
          const record = await Bonus.create({
            userId: metadata.userId,
            teacherId: metadata.teacherId,
            LessonId: metadata.LessonId,
            bookingId: metadata.BookingId,
            amount: metadata.amount,
            currency: pi.currency,
            StripepaymentId: payment._id, // ✅ updated to reflect Stripe
          });
          // Update Booking with Bonus
          await Bookings.findOneAndUpdate(
            { _id: metadata.BookingId },
            {
              IsBonus: true,
              BonusId: record._id,
            },
            { new: true }
          );
          return;
        }
        // Bonus Case ends here

        Loggers.info("📦 Metadata:", metadata);
        let startUTC, endUTC;
        // Convert times to UTC
        if (metadata?.isSpecial) {
          startUTC = metadata.startDateTime;
          endUTC = metadata.endDateTime;
        } else {
          startUTC = DateTime.fromISO(metadata.startDateTime, {
            zone: metadata.timezone,
          })
            .toUTC()
            .toJSDate();
          endUTC = DateTime.fromISO(metadata.endDateTime, {
            zone: metadata.timezone,
          })
            .toUTC()
            .toJSDate();
        }
        // Save payment record
        const payment = new StripePayment({
          srNo: parseInt(metadata.srNo),
          payment_type: "card",
          payment_id: pi.id,
          currency: pi.currency,
          LessonId: metadata.LessonId,
          amount: pi.amount / 100,
          UserId: metadata.userId,
          payment_status: pi.status,
        });
        const savedPayment = await payment.save();
        const teacherEarning = (pi.amount / 100 - metadata.processingFee) * 0.9; // 90% to teacher, 10% to admin as discussed with client
        // Save booking record
        const booking = new Bookings({
          teacherId: metadata.teacherId,
          UserId: metadata.userId,
          teacherEarning,
          adminCommission: metadata.adminCommission,
          LessonId: metadata.LessonId,
          StripepaymentId: savedPayment._id,
          startDateTime: startUTC,
          endDateTime: endUTC,
          currency: pi.currency,
          totalAmount: pi.amount / 100,
          srNo: parseInt(metadata.srNo),
          processingFee: metadata.processingFee || 0,
          notes: metadata.notes || "",
        });
        const record = await booking.save();

        // Updating Specialslot
        if (metadata?.isSpecial) {
          const studentId = new mongoose.Types.ObjectId(metadata.userId);
          const lessonId = new mongoose.Types.ObjectId(metadata.LessonId);
          const updatedSlot = await SpecialSlot.findOneAndUpdate(
            {
              student: studentId,
              lesson: lessonId,
              startDateTime: startUTC,
            },
            { paymentStatus: "paid" },
            { new: true, runValidators: true }
          );
        }

        // Send confirmation email to student
        const user = await User.findById(metadata.userId);
        const teacher = await User.findById(metadata.teacherId);
        const registrationSubject = "Booking Confirmed 🎉";

        // Convert to ISO format for moment parsing in email templates
        // console.log("startUTC", startUTC);
        const utcDateTime = DateTime.fromJSDate(new Date(startUTC), {
          zone: "utc",
        });
        // console.log("utcDateTime", utcDateTime);
        // console.log("user",user);
        // console.log("teacher",teacher);

        const userTimeISO = user?.time_zone
          ? utcDateTime.setZone(user.time_zone).toISO()
          : utcDateTime.toISO();

        const teacherTimeISO = teacher?.time_zone
          ? utcDateTime.setZone(teacher.time_zone).toISO()
          : utcDateTime.toISO();
        // console.log("userTimeISO", userTimeISO);
        // console.log("teacherTimeISO", teacherTimeISO);

        const emailHtml = BookingSuccess(
          userTimeISO,
          user?.name,
          teacher?.name
        );
        await sendEmail({
          email: metadata.email,
          subject: registrationSubject,
          emailHtml,
        });
        // Send Confirmation email to teacher
        const TeacherSubject = "New Booking 🎉";
        const TeacheremailHtml = TeacherBooking(
          teacherTimeISO,
          user?.name,
          teacher?.name
        );
        await sendEmail({
          email: teacher.email,
          subject: TeacherSubject,
          emailHtml: TeacheremailHtml,
        });
        Loggers.info(
          "Stripe webhook received successfully. Payment processed and booking with special slot completed."
        );
        break;
      }

      default:
        Loggers.error(`⚠️ Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  }
);