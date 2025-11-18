"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldLabel,
  FieldContent,
  FieldError,
} from "@/components/ui/field";
import { fetchWithAuth } from "@/lib/auth";

// Add new component for success message with same styling as FieldError
const FieldSuccess = ({ children }: { children: React.ReactNode }) => (
  <span className="text-sm font-medium text-green-600">{children}</span>
);

export default function CreateEvent() {
  const [formData, setFormData] = useState({
    name: "",
    date: "",
    location: "",
    description: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    let hasErrors = false;

    Object.entries(formData).forEach(([key, value]) => {
      if (!value.trim()) {
        newErrors[key] =
          `${key.charAt(0).toUpperCase() + key.slice(1)} is required`;
        hasErrors = true;
      }
    });

    setErrors(newErrors);
    if (hasErrors) {
      setSubmitError("Please fill in all required fields");
      return false;
    }

    setSubmitError("");
    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    try {
      await createEvent(formData);
      setSuccessMessage("Event created successfully!");
      // Reset form
      setFormData({
        name: "",
        date: "",
        location: "",
        description: "",
      });
      // Clear any previous errors
      setErrors({});
      setSubmitError("");
    } catch (error) {
      setSubmitError("Failed to create event");
      console.error("Error creating event:", error);
      setSuccessMessage("");
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Create New Event</h1>

      <form onSubmit={handleSubmit}>
        <Field className="mb-4">
          <FieldLabel>Name</FieldLabel>
          <FieldContent>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                setErrors({ ...errors, name: "" });
                setSubmitError("");
                setSuccessMessage("");
              }}
            />
          </FieldContent>
          {errors.name && <FieldError>{errors.name}</FieldError>}
        </Field>

        <Field className="mb-4">
          <FieldLabel>Date and Time</FieldLabel>
          <FieldContent>
            <Input
              type="datetime-local"
              value={formData.date}
              onChange={(e) => {
                setFormData({ ...formData, date: e.target.value });
                setErrors({ ...errors, date: "" });
                setSubmitError("");
                setSuccessMessage("");
              }}
            />
          </FieldContent>
          {errors.date && <FieldError>{errors.date}</FieldError>}
        </Field>

        <Field className="mb-4">
          <FieldLabel>Location</FieldLabel>
          <FieldContent>
            <Input
              type="text"
              value={formData.location}
              onChange={(e) => {
                setFormData({ ...formData, location: e.target.value });
                setErrors({ ...errors, location: "" });
                setSubmitError("");
                setSuccessMessage("");
              }}
            />
          </FieldContent>
          {errors.location && <FieldError>{errors.location}</FieldError>}
        </Field>

        <Field className="mb-4">
          <FieldLabel>Description</FieldLabel>
          <FieldContent>
            <textarea
              className="w-full p-2 border rounded"
              value={formData.description}
              onChange={(e) => {
                setFormData({ ...formData, description: e.target.value });
                setErrors({ ...errors, description: "" });
                setSubmitError("");
                setSuccessMessage("");
              }}
            />
          </FieldContent>
          {errors.description && <FieldError>{errors.description}</FieldError>}
        </Field>

        <Button type="submit">Create Event</Button>

        {/* Messages container */}
        <div className="mt-4">
          {submitError && <FieldError>{submitError}</FieldError>}
          {successMessage && <FieldSuccess>{successMessage}</FieldSuccess>}
        </div>
      </form>
    </div>
  );
}

export const createEvent = async (eventData: {
  name: string;
  date: string;
  location: string;
  description: string;
}) => {
  const response = await fetchWithAuth(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/events/create/`,
    {
      method: "POST",
      body: JSON.stringify(eventData),
    },
  );

  if (!response.ok) {
    throw new Error("Failed to create event");
  }

  return response.json();
};
