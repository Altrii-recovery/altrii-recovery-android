export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-10 text-gray-200">
      <h1 className="text-3xl font-bold text-white">Contact Us</h1>
      <p>Questions, feedback, partnership ideas, or support requests—we’d love to hear from you.</p>
      <p>
        Email:{" "}
        <a href="mailto:hello@altriirecovery.com" className="text-indigo-400 underline">
          hello@altriirecovery.com
        </a>
      </p>
    </div>
  );
}
