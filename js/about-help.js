/* Real NotesPix support-request submission. Requires the support_requests
   table and RLS policies from sql/support_requests.sql. */
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("helpForm");
  if (!form) return;

  const topicField = document.getElementById("helpTopic");
  const messageField = document.getElementById("helpMessage");
  const feedback = document.getElementById("helpFeedback");
  const submitButton = document.getElementById("helpSubmit");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const topic = topicField.value;
    const message = messageField.value.trim();

    if (!topic || !message) {
      feedback.textContent = "Please choose a topic and describe the issue.";
      return;
    }
    if (message.length > 5000) {
      feedback.textContent = "Please keep your message under 5,000 characters.";
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Sending request…";
    feedback.textContent = "";

    try {
      if (!window.StudyHubData) {
        throw new Error("NotesPix connection is not ready. Please refresh and try again.");
      }
      const { supabase, user } = await window.StudyHubData.requireUser();
      const { error } = await supabase.from("support_requests").insert({
        user_id: user.id,
        email: user.email || null,
        topic,
        message
      });
      if (error) throw error;

      form.reset();
      feedback.textContent = "Your support request has been sent successfully. Thank you for contacting NotesPix.";
      feedback.dataset.state = "success";
    } catch (error) {
      console.error("NotesPix support request failed:", error);
      const msg = error?.message || "Something went wrong. Please try again.";
      if (/support_requests|relation .* does not exist|schema cache/i.test(msg)) {
        feedback.textContent = "Support requests are not activated in the database yet. Run the SQL setup included with this project, then try again.";
      } else if (/log in|auth|session/i.test(msg)) {
        feedback.textContent = "Please log in to your NotesPix account before sending a support request.";
      } else {
        feedback.textContent = msg;
      }
      feedback.dataset.state = "error";
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Send support request";
    }
  });
});
