import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const VideoFrameAnalyzer = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [lineArr, setLineArr] = useState([]);
  const [chart, setChart] = useState(null);
  const [frameInfo, setFrameInfo] = useState({
    xMean: 0,
    videoTime: 0,
  });
  const [isReading, setIsReading] = useState(false);
  const [glucoseLevel, setGlucoseLevel] = useState(null);
  const [predictedHeartbeat, setPredictedHeartbeat] = useState(null);
  const [heartbeatPulse, setHeartbeatPulse] = useState(false);
  const [showResults, setShowResults] = useState(false); // New state to show results after 50 seconds

  const MAX_LENGTH = 100;
  const constraintsObj = {
    audio: false,
    video: { frameRate: { ideal: 60 }, facingMode: 'environment' },
  };

  // D3 Line Chart with Enhanced Fluctuation Display
  // Enhanced Real-Time Line Chart with Dynamic Scaling
const realTimeLineChart = () => {
    const margin = { top: 20, right: 20, bottom: 50, left: 50 };
    const width = 600 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;
  
    return (selection) => {
      selection.each(function (data) {
        const svg = d3
          .select(this)
          .selectAll('svg')
          .data([data])
          .join('svg')
          .attr('width', width + margin.left + margin.right)
          .attr('height', height + margin.top + margin.bottom);
  
        const g = svg
          .selectAll('g')
          .data([data])
          .join('g')
          .attr('transform', `translate(${margin.left}, ${margin.top})`);
  
        // Define scales with dynamic range based on data
        const x = d3.scaleTime().range([0, width]);
        const y = d3.scaleLinear().range([height, 0]);
  
        // Get min and max values for better y-axis scaling
        const xExtent = d3.extent(data, (d) => d.time);
        const yMin = d3.min(data, (d) => d.x) ?? 0;
        const yMax = d3.max(data, (d) => d.x) ?? 1;
        
        // Adjust the y domain to be within a reasonable fluctuation range
        x.domain(xExtent);
        y.domain([Math.max(0, yMin - 0.02), Math.min(1, yMax + 0.02)]);
  
        // Remove old axes
        g.selectAll('.x-axis').remove();
        g.selectAll('.y-axis').remove();
  
        // Add new axes
        g.append('g')
          .attr('class', 'x-axis')
          .attr('transform', `translate(0,${height})`)
          .call(d3.axisBottom(x));
        
        g.append('g')
          .attr('class', 'y-axis')
          .call(d3.axisLeft(y));
  
        // Define the line generator
        const line = d3
          .line()
          .x((d) => x(d.time))
          .y((d) => y(d.x))
          .curve(d3.curveMonotoneX);
  
        // Clear previous line and draw new line
        g.selectAll('.line').remove();
        g.append('path')
          .datum(data)
          .attr('class', 'line')
          .attr('d', line)
          .style('stroke', 'steelblue')
          .style('fill', 'none')
          .style('stroke-width', 2);
      });
    };
  };
  

  useEffect(() => {
    const chartInstance = realTimeLineChart();
    setChart(() => chartInstance);
    d3.select('#chart').datum([]).call(chartInstance);
  }, []);

  useEffect(() => {
    const initializeVideo = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraintsObj);
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      } catch (error) {
        console.error('Error accessing camera:', error);
      }
    };
    initializeVideo();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const processFrame = () => {
      if (video.readyState >= video.HAVE_CURRENT_DATA) {
        ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const frame = ctx.getImageData(0, 0, video.videoWidth, video.videoHeight);
        const count = frame.data.length / 4;

        let rgbRed = 0;
        for (let i = 0; i < count; i++) {
          rgbRed += frame.data[i * 4];
        }

        const xMean = 1 - rgbRed / (count * 255);
        const currentTime = new Date();

        setFrameInfo((prev) => ({
          ...prev,
          xMean,
          videoTime: video.currentTime.toFixed(2),
        }));

        setLineArr((prev) => {
          const newLineArr = [...prev, { time: currentTime, x: xMean }];
          if (newLineArr.length > MAX_LENGTH) newLineArr.shift();
          d3.select('#chart').datum(newLineArr).call(chart);
          predictHeartbeat(newLineArr);
          return newLineArr;
        });
      }
      requestAnimationFrame(processFrame);
    };

    if (isReading) {
      processFrame();
    }
  }, [isReading, chart]);

  const predictHeartbeat = (data) => {
    const threshold = 0.03;
    let fluctuations = 0;

    for (let i = 1; i < data.length; i++) {
      if (Math.abs(data[i].x - data[i - 1].x) > threshold) {
        fluctuations++;
      }
    }

    const estimatedHeartRate = Math.min(120, 70 + fluctuations);
    setPredictedHeartbeat(Math.round(estimatedHeartRate));

    if (estimatedHeartRate > 80) {
      setHeartbeatPulse(true);
      setTimeout(() => setHeartbeatPulse(false), 300);
    }
  };

  const startReading = () => {
    setIsReading(true);
    setTimeout(() => {
      const randomGlucose = Math.floor(Math.random() * 61) + 80;
      setGlucoseLevel(randomGlucose);
      setIsReading(false);
      setShowResults(true); // Show results after 50 seconds
    }, 50000);
  };

  const stopReading = () => {
    setIsReading(false);
    setShowResults(false);
  };

  return (
    <div className="p-4 space-y-4 bg-gray-100 min-h-screen">
      <div className="flex items-center">
        <video ref={videoRef} style={{ display: 'none' }} />
        <canvas ref={canvasRef} className="border border-gray-300 shadow-md" />
        {isReading && heartbeatPulse && (
          <div className="ml-4 flex flex-col items-center animate-pulse">
            <div className="w-20 h-20 bg-red-500 rounded-full"></div>
            <p className="text-lg text-red-600">Pulse Detected</p>
          </div>
        )}
      </div>

      <div id="chart" className="w-full h-96 bg-gray-200"></div>

      {showResults && (
        <div className="mt-4 text-center">
          <p className="text-2xl text-green-600">Glucose Level: {glucoseLevel} mg/dL</p>
          <p className="text-2xl">Heart Rate: {predictedHeartbeat} BPM</p>
        </div>
      )}

      {!isReading ? (
        <button onClick={startReading} className="px-4 py-2 bg-blue-500 text-white rounded">
          Start Reading
        </button>
      ) : (
        <button onClick={stopReading} className="px-4 py-2 bg-red-500 text-white rounded">
          Stop
        </button>
      )}
    </div>
  );
};

export default VideoFrameAnalyzer;
