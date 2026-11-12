/* Sends support requests to the support_requests table for signed-in users. */
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("helpForm");
  if (!form) return;

  const topicField = document.getElementById("helpTopic");
  const messageField = document.getElementById("helpMessage");
  const feedback = document.getElementById("helpFeedback");
  const submitButton = document.getElementById("helpSubmit");

  const setFeedback = (message, state) => {
    feedback.textContent = message;
    feedback.dataset.state = state;
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const topic = topicField.value;
    const message = messageField.value.trim();

    if (!topic || !message) {
      setFeedback("Please choose a topic and describe the issue.", "error");
      return;
    }
    if (message.length > 5000) {
      setFeedback("Please keep your message under 5,000 characters.", "error");
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Sending request…";
    feedback.textContent = "";

    try {
      if (!window.NotesPixData) {
        throw new Error("NotesPix could not connect. Please refresh and try again.");
      }
      const { supabase, user } = await window.NotesPixData.requireUser();
      const { error } = await supabase.from("support_requests").insert({
        user_id: user.id,
        email: user.email || null,
        topic,
        message
      });
      if (error) throw error;

      form.reset();
      setFeedback("Your support request has been sent. We will reply by email if needed.", "success");
    } catch (error) {
      console.error("NotesPix support request failed:", error);
      setFeedback(
        window.NotesPixData?.friendlyError(error, "We could not send your request. Please try again.") ||
          "We could not send your request. Please try again.",
        "error"
      );
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Send support request";
    }
  });
});
