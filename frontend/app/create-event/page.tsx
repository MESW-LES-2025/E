"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldLabel,
  FieldContent,
  FieldError,
} from "@/components/ui/field";

export default function CreateEvent() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        title: '',
        datetime: '',
        location: '',
        description: ''
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitError, setSubmitError] = useState<string>('');

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        let hasErrors = false;

        Object.entries(formData).forEach(([key, value]) => {
            if (!value.trim()) {
                newErrors[key] = `${key.charAt(0).toUpperCase() + key.slice(1)} is required`;
                hasErrors = true;
            }
        });

        setErrors(newErrors);
        if (hasErrors) {
            setSubmitError('Please fill in all required fields');
            return false;
        }
        
        setSubmitError('');
        return true;
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!validateForm()) {
            return;
        }
    
      try {
          // API call to create event would go here

          // After successful creation:
          router.push('/event'); // Redirect to events page
      } catch (error) {
          setSubmitError('Failed to create event');
      }
    };

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6">Create New Event</h1>
            <form onSubmit={handleSubmit}>
                <Field className="mb-4">
                    <FieldLabel>Title</FieldLabel>
                    <FieldContent>
                        <Input
                            type="text"
                            value={formData.title}
                            onChange={(e) => {
                                setFormData({...formData, title: e.target.value});
                                setErrors({...errors, title: ''});
                                setSubmitError('');
                            }}
                        />
                    </FieldContent>
                    {errors.title && <FieldError>{errors.title}</FieldError>}
                </Field>

                <Field className="mb-4">
                    <FieldLabel>Date and Time</FieldLabel>
                    <FieldContent>
                        <Input
                            type="datetime-local"
                            value={formData.datetime}
                            onChange={(e) => {
                                setFormData({...formData, datetime: e.target.value});
                                setErrors({...errors, datetime: ''});
                                setSubmitError('');
                            }}
                        />
                    </FieldContent>
                    {errors.datetime && <FieldError>{errors.datetime}</FieldError>}
                </Field>

                <Field className="mb-4">
                    <FieldLabel>Location</FieldLabel>
                    <FieldContent>
                        <Input
                            type="text"
                            value={formData.location}
                            onChange={(e) => {
                                setFormData({...formData, location: e.target.value});
                                setErrors({...errors, location: ''});
                                setSubmitError('');
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
                                setFormData({...formData, description: e.target.value});
                                setErrors({...errors, description: ''});
                                setSubmitError('');
                            }}
                        />
                    </FieldContent>
                    {errors.description && <FieldError>{errors.description}</FieldError>}
                </Field>

                <Button type="submit">Create Event</Button>
                {submitError && (
                    <div className="mt-4">
                        <FieldError>{submitError}</FieldError>
                    </div>
                )}
            </form>
        </div>
    );
}