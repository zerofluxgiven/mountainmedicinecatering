import React from "react";
import { Routes, Route, Link } from "react-router-dom";

function Home() {
  return <h2>Welcome to the Kitchen App</h2>;
}

function About() {
  return <h2>About this project</h2>;
}

export default function App() {
  return (
    <div style={{ padding: "2rem" }}>
      <h1>Mountain Medicine /kitchen/</h1>
      <nav>
        <Link to="/">Home</Link> | <Link to="/about">About</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </div>
  );
}
