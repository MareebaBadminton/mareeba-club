'use client'

import { useState } from "react";
import Image from "next/image";
import Navigation from "@/components/Navigation";
import RegisterForm from "@/components/RegisterForm";
import BookingForm from "@/components/BookingForm";
import SessionPlayerList from "@/components/SessionPlayerList";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Mareeba Badminton Club</h1>
        <p className="text-xl">Welcome to our club!</p>
      </div>
    </div>
  );
}
