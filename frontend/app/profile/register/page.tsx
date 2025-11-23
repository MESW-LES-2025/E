"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isAuthenticated, register, type RegisterRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldLabel,
  FieldContent,
  FieldError,
} from "@/components/ui/field";

type RegistrationType = "student" | "organizer";

type FormState = {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  password: string;
};

interface FieldErrors {
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  password?: string;
  general?: string;
}

type TouchedState = Record<keyof FormState, boolean>;

const initialForm: FormState = {
  username: "",
  email: "",
  first_name: "",
  last_name: "",
  password: "",
};

function normalizeError(msg: string | undefined): string | undefined {
  if (!msg) return msg;
  const trimmed = msg.trim();
  if (!trimmed) return msg;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function validatePassword(values: FormState): string | undefined {
  const { password, username, email, first_name, last_name } = values;

  if (!password.trim()) return "Password is required.";

  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }

  if (/^\d+$/.test(password)) {
    return "Password cannot be only numbers.";
  }

  const lowerPw = password.toLowerCase();
  const emailLocal =
    email && email.includes("@") ? email.split("@")[0].toLowerCase() : "";

  const tooSimilar =
    (username && lowerPw.includes(username.toLowerCase().trim())) ||
    (emailLocal && lowerPw.includes(emailLocal)) ||
    (first_name && lowerPw.includes(first_name.toLowerCase().trim())) ||
    (last_name && lowerPw.includes(last_name.toLowerCase().trim()));

  if (tooSimilar) {
    return "Password is too similar to your personal information.";
  }

  return undefined;
}

function validate(values: FormState): FieldErrors {
  const newErrors: FieldErrors = {};

  if (!values.username.trim()) {
    newErrors.username = "Username is required.";
  }

  if (!values.email.trim()) {
    newErrors.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    newErrors.email = "Email is not valid.";
  }

  if (!values.first_name.trim()) {
    newErrors.first_name = "First name is required.";
  }

  if (!values.last_name.trim()) {
    newErrors.last_name = "Last name is required.";
  }

  const pwError = validatePassword(values);
  if (pwError) {
    newErrors.password = pwError;
  }

  return newErrors;
}

export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated()) {
      router.push("/profile");
    }
  }, [router]);

  const [registrationType, setRegistrationType] =
    useState<RegistrationType>("student");

  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<FieldErrors>(() =>
    validate(initialForm),
  );
  const [touched, setTouched] = useState<TouchedState>({
    username: false,
    email: false,
    first_name: false,
    last_name: false,
    password: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange =
    (field: keyof FormState) => (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      const next = { ...form, [field]: value };

      setForm(next);

      setTouched((prev) => ({
        ...prev,
        [field]: field === "password" ? prev.password : true,
      }));

      const nextErrors = validate(next);
      setErrors({ ...nextErrors, general: undefined });
    };

  const fieldError = (field: keyof FormState): string | undefined => {
    if (!touched[field]) return undefined;
    return errors[field];
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    setTouched({
      username: true,
      email: true,
      first_name: true,
      last_name: true,
      password: true,
    });

    const clientErrors = validate(form);
    const hasClientErrors = Object.values(clientErrors).some(Boolean);
    setErrors((prev) => ({ ...prev, ...clientErrors, general: prev.general }));

    if (hasClientErrors) {
      return;
    }

    setIsSubmitting(true);

    try {
      const role: RegisterRole =
        registrationType === "student" ? "ATTENDEE" : "ORGANIZER";

      await register({
        ...form,
        role,
      });

      router.push("/profile/login?registered=1");
    } catch (err) {
      console.error("Registration error", err);

      const errData = err as Record<string, unknown>;
      const apiErrors: FieldErrors = {};

      const mapField = (field: keyof FieldErrors, key?: string) => {
        const k = key ?? field;
        const value = errData[k];

        if (Array.isArray(value) && value.length > 0) {
          const first = value[0];
          if (typeof first === "string") {
            apiErrors[field] = normalizeError(first);
          }
        } else if (typeof value === "string") {
          apiErrors[field] = normalizeError(value);
        }
      };

      mapField("username", "username");
      mapField("email", "email");
      mapField("password", "password");

      const detail = errData.detail;
      const nonField = errData.non_field_errors;

      if (typeof detail === "string") {
        apiErrors.general = normalizeError(detail);
      } else if (Array.isArray(nonField) && nonField.length > 0) {
        const first = nonField[0];
        if (typeof first === "string") {
          apiErrors.general = normalizeError(first);
        }
      }

      if (!apiErrors.general && Object.keys(apiErrors).length === 0) {
        apiErrors.general = "Registration failed. Please check your data.";
      }

      setTouched({
        username: true,
        email: true,
        first_name: true,
        last_name: true,
        password: true,
      });
      setErrors((prev) => ({ ...prev, ...apiErrors }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const allFilled =
    form.username.trim() !== "" &&
    form.email.trim() !== "" &&
    form.first_name.trim() !== "" &&
    form.last_name.trim() !== "" &&
    form.password.trim() !== "";

  const hasAnyErrors =
    !!errors.username ||
    !!errors.email ||
    !!errors.first_name ||
    !!errors.last_name ||
    !!errors.password ||
    !!errors.general;

  const isSubmitDisabled = isSubmitting || !allFilled || hasAnyErrors;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-md rounded-xl border bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-center mb-4">
          Create an account
        </h1>

        {/* Student / Organizer toggle */}
        <div className="flex gap-2 mb-6 justify-center">
          <Button
            type="button"
            variant={registrationType === "student" ? "default" : "outline"}
            onClick={() => setRegistrationType("student")}
          >
            Student
          </Button>
          <Button
            type="button"
            variant={registrationType === "organizer" ? "default" : "outline"}
            onClick={() => setRegistrationType("organizer")}
          >
            Organizer
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field>
            <FieldLabel htmlFor="username">Username</FieldLabel>
            <FieldContent>
              <Input
                id="username"
                value={form.username}
                onChange={handleChange("username")}
                autoComplete="username"
              />
            </FieldContent>
            {fieldError("username") && (
              <FieldError>{fieldError("username")}</FieldError>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <FieldContent>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={handleChange("email")}
                autoComplete="email"
              />
            </FieldContent>
            {fieldError("email") && (
              <FieldError>{fieldError("email")}</FieldError>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="first_name">
              {registrationType === "organizer"
                ? "Contact first name"
                : "First name"}
            </FieldLabel>
            <FieldContent>
              <Input
                id="first_name"
                value={form.first_name}
                onChange={handleChange("first_name")}
                autoComplete="given-name"
              />
            </FieldContent>
            {fieldError("first_name") && (
              <FieldError>{fieldError("first_name")}</FieldError>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="last_name">
              {registrationType === "organizer"
                ? "Contact last name"
                : "Last name"}
            </FieldLabel>
            <FieldContent>
              <Input
                id="last_name"
                value={form.last_name}
                onChange={handleChange("last_name")}
                autoComplete="family-name"
              />
            </FieldContent>
            {fieldError("last_name") && (
              <FieldError>{fieldError("last_name")}</FieldError>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <FieldContent>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={handleChange("password")}
                autoComplete="new-password"
              />
            </FieldContent>
            {fieldError("password") && (
              <FieldError>{fieldError("password")}</FieldError>
            )}
            <p className="mt-1 text-xs text-slate-500">
              Password must be at least 8 characters, not entirely numeric, and
              not too similar to your personal information (name, username, or
              email).
            </p>
          </Field>

          {errors.general && (
            <p className="text-sm text-red-600 mt-1 text-center">
              {errors.general}
            </p>
          )}

          <Button
            type="submit"
            className="w-full mt-2"
            disabled={isSubmitDisabled}
          >
            {isSubmitting ? "Creating account..." : "Sign up"}
          </Button>
        </form>

        <div className="my-4">
          <Separator />
        </div>

        <div className="mt-2 text-md text-center">
          <span className="text-sm text-slate-600">
            Already have an account?{" "}
            <Link
              href="/profile/login"
              className="text-blue-600 hover:underline"
            >
              Go to login
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
}
