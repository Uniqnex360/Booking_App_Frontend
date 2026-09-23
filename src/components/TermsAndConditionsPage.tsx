// src/pages/TermsAndConditionsPage.tsx
import React from 'react';

const TermsAndConditionsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F5F5F7] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm p-8 md:p-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Terms & Conditions</h1>
        <p className="text-sm text-slate-500 mb-8 border-b border-slate-200 pb-6">
          Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>

        <div className="space-y-8 text-slate-700 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">1. General Overview</h2>
            <p>
              Welcome to Vyhbz. By accessing and using our website, application, and ticket booking services, you agree to be bound by these Terms and Conditions. 
              If you do not agree with any part of these terms, you must abstain from using our services. 
              These terms apply to all visitors, users, and others who access or use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">2. Ticket Booking Policy</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Tickets once purchased cannot be canceled, exchanged, or refunded unless the event/movie is canceled by the organizers or cinema.</li>
              <li>A convenience fee is charged on all tickets booked online. This fee is non-refundable.</li>
              <li>Users must present a valid m-ticket or physical printout at the venue along with valid photo ID if requested.</li>
              <li>Vyhbz does not guarantee seat availability until the payment gateway confirms the transaction.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">3. Age Restrictions & Ratings</h2>
            <p>
              Users are responsible for checking the age rating (e.g., U, U/A, A) of a movie before purchasing tickets. 
              Cinema authorities reserve the right to deny entry to individuals who do not meet the age requirements for 'A' rated films, even if a ticket has been purchased. No refunds will be issued in such cases.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">4. Privacy Policy</h2>
            <p>
              Your privacy is important to us. Our use of your personal information is governed by our Privacy Policy. 
              By using Vyhbz, you consent to the collection, use, and sharing of your data as described in the Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">5. User Accounts</h2>
            <p>
              When you create an account with us, you must provide information that is accurate, complete, and current at all times. 
              Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.
              You are responsible for safeguarding the password that you use to access the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">6. Limitation of Liability</h2>
            <p>
              Vyhbz is a ticketing platform and acts as an intermediary between users and cinemas/event organizers. 
              We are not responsible for the quality of the movie, event, or the venue's services (e.g., AC, food quality, seating condition). 
              Any disputes regarding the venue must be addressed directly with the venue management.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditionsPage;