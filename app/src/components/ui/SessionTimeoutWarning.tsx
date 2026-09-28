import React, { useState, useEffect } from 'react';

export function SessionTimeoutWarning() {
  const [timeLeft, setTimeLeft] = useState(60 * 5); // 5 mins warning
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Simulate session countdown
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        if (prev === 60 * 5) setShow(true);
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-4 right-4 p-4 bg-yellow-100 border border-yellow-400 rounded shadow-lg text-black">
      <h3 className="font-bold">Session Expiring</h3>
      <p>Your session will expire in {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}.</p>
      <button onClick={() => setShow(false)} className="mt-2 bg-blue-500 text-white px-4 py-1 rounded">
        Extend Session
      </button>
    </div>
  );
}
