import { useState } from "react";

const InterviewHelper = () => {
  const [test, setTest] = useState("App is working!");

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>🎤 Interview Helper</h1>
      <p>{test}</p>
      <button onClick={() => setTest("Button clicked! " + Date.now())}>
        Test Button
      </button>
      <div style={{ marginTop: '2rem' }}>
        <p>If you can see this, React is working!</p>
        <p>Next we'll add the real features back.</p>
      </div>
    </div>
  );
};

export default InterviewHelper;