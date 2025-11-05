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
        name: '',
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
          await createEvent(formData);
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
                    <FieldLabel>Name</FieldLabel>
                    <FieldContent>
                        <Input
                            type="text"
                            value={formData.name}
                            onChange={(e) => {
                                setFormData({...formData, name: e.target.value});
                                setErrors({...errors, name: ''});
                                setSubmitError('');
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

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
    const authTokens = localStorage.getItem('auth_tokens');
    let token = null;
    
    if (authTokens) {
        try {
            const tokens = JSON.parse(authTokens);
            token = tokens.access;
        } catch (error) {
            console.error('Error parsing auth tokens:', error);
        }
    }
    
    const headers: any = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    return fetch(url, {
        ...options,
        headers,
    });
}

export const createEvent = async (eventData: {
    name: string;
    datetime: string;
    location: string;
    description: string;
}) => {
    const response = await fetchWithAuth('http://localhost:8000/api/events/create/', {
        method: 'POST',
        body: JSON.stringify(eventData),
    });

    if (!response.ok) {
        throw new Error('Failed to create event');
    }

    return response.json();
};