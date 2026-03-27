import React from 'react';
import './HamsterSpinner.css';

const HamsterSpinner = ({ message = "Procesando...", size = "medium" }) => {
  return (
    <div className={`hamster-spinner-container ${size}`}>
      <div aria-label="Hámster corriendo procesando tu pedido" role="img" className="wheel-and-hamster">
        <div className="wheel"></div>
        <div className="hamster">
          <div className="hamster__body">
            <div className="hamster__head">
              <div className="hamster__ear"></div>
              <div className="hamster__eye"></div>
              <div className="hamster__nose"></div>
            </div>
            <div className="hamster__limb hamster__limb--fr"></div>
            <div className="hamster__limb hamster__limb--fl"></div>
            <div className="hamster__limb hamster__limb--br"></div>
            <div className="hamster__limb hamster__limb--bl"></div>
            <div className="hamster__tail"></div>
          </div>
        </div>
        <div className="spoke"></div>
      </div>
      {message && <p className="spinner-message">{message}</p>}
    </div>
  );
};

export default HamsterSpinner;