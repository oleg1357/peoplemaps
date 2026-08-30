"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { IconMapMarker, IconPlus } from "@/components/icons";
import { PeopleMapsLogo } from "@/components/Logo";

export default function SignupPage() {
  const { signup } = useAuth();
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    const res = signup(firstName, lastName, email, userPassword);
    if (!res.ok) {
      setError(res.message);
    } else {
      router.push("/");
    }
  };

  return (
    <div className="page">
      <div className="flex auth-layout" style={{ height: "100%" }}>
        <div className="sign-box">
          <div className="signup auth-card">
            <h2>Create profile</h2>
            <input
              className="input"
              type="text"
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <input
              className="input"
              type="text"
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
            <input
              className="input"
              type="text"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="input"
              type="password"
              placeholder="Password"
              value={userPassword}
              onChange={(e) => setUserPassword(e.target.value)}
            />
            {error && <p className="auth-error">{error}</p>}
            <div>
              <button className="action-btn" onClick={submit}>
                Sign up
              </button>
            </div>
          </div>
        </div>
        <div className="singin-image">
          <div className="flex" style={{ justifyContent: "center" }}>
            <PeopleMapsLogo size={130} />
          </div>
          <div className="flex" style={{ justifyContent: "center" }}>
            <IconMapMarker size={60} color="#2986ce" />
            <IconPlus size={60} color="#00b464" />
            <IconMapMarker size={60} color="#F94848" />
          </div>
          <img
            id="auth-image"
            src="https://i.ibb.co/hL2mS5V/pin-3.png"
            alt="PeopleMaps map pin"
          />
        </div>
      </div>
    </div>
  );
}
