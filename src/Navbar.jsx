import React from "react";

function Navbar() {
  return (
    <>
      <div className="font-bold flex justify-between items-center bg-white p-5 shadow-lg">
        <div className="cursor-pointer">
          <img
            className="h-12 w-13"
            src="https://media.istockphoto.com/id/1275720974/vector/blue-and-green-medical-cross-health.jpg?s=612x612&w=0&k=20&c=j322qhLcySdh7qhtlTnUf_EUzlQG2i9bnoJ3vHdJ81I="
            alt="Logo"
          />
        </div>
        <div className="h-10 w-10 cursor-pointer">
          <img
            className="rounded-full"
            src="https://static.vecteezy.com/system/resources/previews/005/129/844/non_2x/profile-user-icon-isolated-on-white-background-eps10-free-vector.jpg"
            alt="user image"
          />
        </div>
      </div>
    </>
  );
}

export default Navbar;
