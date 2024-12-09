import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Navbar from "./Navbar";
import HeroSection from "./HeroSection";
import VideoFrameAnalyzer from "./VideoFrameAnalyzer";
import Footer from "./Footer";

function App() {
  return (
    <Router>
      <div
        className="h-full"
        style={{
          background: "linear-gradient(135deg, #005c97, #363795)", // Bright gradient background
        }}
      >
        <Navbar />
        <Routes>
          <Route path="/" element={<HeroSection />} />
          <Route path="/analyze" element={<VideoFrameAnalyzer />} />
        </Routes>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
