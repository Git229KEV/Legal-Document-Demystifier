import React from 'react';
import Navbar from './Components/Navbar/Navbar';
import AuthPage from './pages/AuthPage/AuthPage';
import ResultsPage from './pages/ResultsPage/ResultsPage';
import Hero from './Components/Hero/Hero';
import Program from './Components/Program/Program';
import Title from './Components/Title/Title';
import About from './Components/About/About';
import Uploads from './Components/Uploads/Uploads';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

const App = () => {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <Routes>
          {/* Instead of a clean component, you list everything here */}
          <Route path="/" element={
            <>
              <Hero />
              <main className="container">
                <Title subTitle="Our Services" title="Types of Documents" />
                <Program />
                <About />
                <Title subTitle="Try now!!!!" title="Upload your Document Here" />
                <Uploads />
              </main>
            </>
          } />

          <Route path="/auth" element={<AuthPage />} />
          <Route path="/results" element={<ResultsPage />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;