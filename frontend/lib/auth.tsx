import Cookies from "js-cookie";

const API_URL = "http://localhost:8080"; // change if needed

type RegisterPayload = {
  firstName: string;
  lastName: string;
  email: string;
  phoneCountry: string;
  phoneNumber: string;
  gender: string;
  dateOfBirth: string;
  password: string;
};

export async function register(payload: RegisterPayload) {
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error("Register failed");

  const data = await res.json();

  Cookies.set("token", data.token);

  return data.user;
}

export async function login(email: string, password: string) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) throw new Error("Login failed");

  const data = await res.json();

  Cookies.set("token", data.token);

  return data.user;
}

export function logout() {
  localStorage.removeItem("token");
  Cookies.remove("token");
  window.location.href = "/";
}
