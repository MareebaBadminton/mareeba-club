import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-blue-800 text-white py-6 mt-auto">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">Mareeba Badminton Club</h3>
            <p className="text-sm">
              ABN: 61 470 216 342<br />
              mareebabadminton.com.au
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact</h3>
            <p className="text-sm">
              Email: info@mareebabadminton.com.au<br />
              Location: Mareeba, QLD
            </p>
          </div>
        </div>
        <div className="mt-8 pt-4 border-t border-blue-700 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} Mareeba Badminton Club. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 