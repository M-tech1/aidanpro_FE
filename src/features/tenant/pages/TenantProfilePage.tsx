import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { tenantApi } from "@/features/tenant/api/tenantApi";
import { ApiError, isAbortError } from "@/shared/api/httpClient";
import { withRetry } from "@/shared/utils/withRetry";
import { apiCache, CACHE_KEYS } from "@/shared/cache/apiCache";
import type {
  TenantProfileResponse,
  TenantProfilePayload,
} from "@/features/tenant/api/tenantApi";
import { DEFAULT_COUNTRY, countryName } from "@/shared/config/countries";
import { useAvailableCountries } from "@/shared/config/useAvailableCountries";

const profileSchema = z.object({
  name: z.string().min(2, "Company name must be at least 2 characters"),
  timezone: z.string().min(1, "Timezone is required"),
  industry: z.string().min(1, "Industry is required"),
  country: z.string().length(2, "Country is required"),
  default_email_recipients: z
    .string()
    .min(1, "At least one email recipient is required"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "America/Vancouver",
  "America/Edmonton",
  "America/Winnipeg",
  "America/Halifax",
  "America/St_Johns",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Amsterdam",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
];

const INDUSTRIES: Record<string, string[]> = {
  "Plumbing & Water Systems": [
    "Plumbing Services",
    "Drain Cleaning",
    "Septic Services",
    "Water Tank Cleaning",
    "Water Treatment",
    "Borehole Services",
    "Plumbing Supplies",
    "Irrigation Services",
  ],
  "Electrical & Power": [
    "Electrical Services",
    "Electrical Supplies",
    "Generator Services",
    "Generator Repair",
    "Solar Installation",
    "Solar Maintenance",
    "Outdoor Lighting",
  ],
  "HVAC & Climate Control": [
    "HVAC Services",
    "Air Conditioning Services",
    "Heating Services",
  ],
  "Appliance Repair": [
    "Appliance Repair",
    "Refrigerator Repair",
    "Washing Machine Repair",
  ],
  "Roofing & Exterior": [
    "Roofing Services",
    "Gutter Services",
    "Chimney Services",
  ],
  "Construction & Structural": [
    "Masonry",
    "Bricklaying",
    "Concrete Services",
    "Welding Services",
    "Building Maintenance",
    "Facility Maintenance",
    "Construction Equipment Rental",
  ],
  "Renovation & Remodeling": [
    "Interior Renovation",
    "Kitchen Remodeling",
    "Bathroom Remodeling",
    "Home Remodeling",
    "Flooring Services",
    "Tiling Services",
    "Painting Services",
    "Driveway Installation",
  ],
  "Carpentry, Windows & Doors": [
    "Carpentry",
    "Woodworking",
    "Glass Installation",
    "Window Installation",
    "Door Installation",
    "Fence Installation",
    "Gate Installation",
  ],
  "Security & Smart Home": [
    "Locksmith Services",
    "Home Security Installation",
    "CCTV Installation",
    "Alarm System Installation",
    "Smart Home Installation",
    "Home Automation",
    "Security Guard Services",
  ],
  "Cleaning Services": [
    "Home Cleaning",
    "Deep Cleaning",
    "Carpet Cleaning",
    "Upholstery Cleaning",
    "Window Cleaning",
    "Pressure Washing",
  ],
  "Pest Control": ["Pest Control", "Fumigation Services", "Pest Inspection"],
  "Lawn, Garden & Pool": [
    "Lawn Care",
    "Lawn Mowing",
    "Landscaping",
    "Gardening Services",
    "Tree Trimming",
    "Tree Removal",
    "Pool Maintenance",
    "Pool Cleaning",
    "Garden Equipment Services",
  ],
  "Interior Design & Décor": [
    "Interior Decoration",
    "Home Staging",
    "Upholstery Services",
    "Curtain Installation",
    "Blinds Installation",
    "Furniture Assembly",
    "Furniture Repair",
  ],
  "Property & Home Management": [
    "Property Maintenance",
    "Handyman Services",
    "Home Inspection",
    "Property Valuation",
    "Property Management",
    "Home Equipment Rental",
    "Moving Services",
  ],
  "Domestic & Care Services": [
    "Domestic Staffing",
    "Housekeeping Services",
    "Babysitting Services",
    "Elderly Care Services",
    "Pet Care Services",
    "Pet Grooming",
    "Waste Collection",
    "Recycling Services",
  ],
  "Automotive Services": [
    "Mobile Car Wash",
    "Auto Detailing",
    "Car Repair",
    "Tire Services",
    "Auto Electrical Services",
    "Car Air Conditioning",
    "Motorcycle Repair",
  ],
  "Retail & Consumer Goods": [
    "Perfumery & Fragrances",
    "Boutique / Clothing Store",
    "Shoe Store",
    "Jewelry Store",
    "Gift Shop",
    "Bookstore",
    "Electronics Store",
    "Furniture Store",
    "Grocery Store",
    "Convenience Store",
  ],
  "Beauty & Personal Care": [
    "Hair Salon",
    "Barbershop",
    "Nail Salon",
    "Spa & Wellness",
    "Makeup Artistry",
    "Tattoo & Piercing Studio",
    "Tailoring & Alterations",
    "Dry Cleaning & Laundry",
  ],
  "Health & Wellness": [
    "Medical Clinic",
    "Dental Clinic",
    "Physiotherapy",
    "Fitness Studio / Gym",
    "Yoga Studio",
    "Nutrition & Dietetics",
    "Veterinary Services",
    "Pharmacy",
  ],
  "Food & Hospitality": [
    "Restaurant",
    "Café & Coffee Shop",
    "Catering Services",
    "Bakery",
    "Food Truck",
    "Bar & Lounge",
    "Hotel & Bed and Breakfast",
    "Event Venue Rental",
  ],
  "Professional & Creative Agencies": [
    "Boutique Agency / Consulting Firm",
    "Marketing Agency",
    "Advertising Agency",
    "Branding & Design Agency",
    "Public Relations Agency",
    "Social Media Management",
    "Photography Services",
    "Videography Services",
    "Web Design & Development",
    "Recruitment Agency",
    "Travel Agency",
  ],
  "Finance, Legal & Consulting": [
    "Accounting & Bookkeeping",
    "Legal Services",
    "Business Consulting",
    "Tax Preparation",
    "Financial Advisory",
    "Insurance Agency",
    "Notary Services",
  ],
  "Real Estate Services": [
    "Real Estate Agency",
    "Property Sales",
    "Mortgage & Loan Services",
    "Property Valuation Services",
  ],
  "Education & Training": [
    "Tutoring Services",
    "Language School",
    "Driving School",
    "Vocational Training",
    "Daycare & Preschool",
  ],
  "Events & Entertainment": [
    "Event Planning",
    "Wedding Planning",
    "DJ & Entertainment Services",
    "Party Rental Services",
  ],
  "Technology & IT Services": [
    "IT Support Services",
    "Software Development",
    "Computer & Phone Repair",
    "Cybersecurity Services",
    "Telecom Services",
  ],
  "Logistics & Delivery": [
    "Courier Services",
    "Freight & Trucking",
    "Packaging & Shipping Services",
  ],
};

const UNMATCHED_INDUSTRY_CATEGORY = "Current Selection";

function findIndustryCategory(industry: string | undefined | null): string {
  if (!industry) return "";
  for (const [category, subIndustries] of Object.entries(INDUSTRIES)) {
    if (subIndustries.includes(industry)) return category;
  }
  return "";
}

const IconEdit = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const IconSave = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
);
const IconX = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export function TenantProfilePage() {
  const countries = useAvailableCountries();
  const [profile, setProfile] = useState<TenantProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [industryCategory, setIndustryCategory] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ProfileFormValues>({ resolver: zodResolver(profileSchema) });

  // Options for the sub-industry select. Falls back to a synthetic category
  // so a legacy/unrecognized industry value stays visible instead of
  // silently disappearing from the dropdown.
  const industrySubOptions =
    industryCategory === UNMATCHED_INDUSTRY_CATEGORY
      ? [profile?.tenant.industry ?? ""]
      : (INDUSTRIES[industryCategory] ?? []);

  const industryCategoryOptions =
    industryCategory === UNMATCHED_INDUSTRY_CATEGORY
      ? [UNMATCHED_INDUSTRY_CATEGORY, ...Object.keys(INDUSTRIES)]
      : Object.keys(INDUSTRIES);

  const handleIndustryCategoryChange = (category: string) => {
    setIndustryCategory(category);
    setValue("industry", "");
  };

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const loadProfile = async () => {
      // Return cached data immediately
      const cached = apiCache.get(CACHE_KEYS.tenantProfile);
      if (cached) {
        reset({
          name: cached.tenant.name,
          timezone: cached.tenant.timezone,
          industry: cached.tenant.industry,
          country: cached.tenant.country || DEFAULT_COUNTRY,
          default_email_recipients:
            cached.tenant.default_email_recipients.join(", "),
        });
        setIndustryCategory(
          findIndustryCategory(cached.tenant.industry) ||
            (cached.tenant.industry ? UNMATCHED_INDUSTRY_CATEGORY : ""),
        );
        setProfile(cached);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await withRetry(
          () => tenantApi.getProfile(signal),
          signal,
        );
        apiCache.set(CACHE_KEYS.tenantProfile, data);
        reset({
          name: data.tenant.name,
          timezone: data.tenant.timezone,
          industry: data.tenant.industry,
          country: data.tenant.country || DEFAULT_COUNTRY,
          default_email_recipients:
            data.tenant.default_email_recipients.join(", "),
        });
        setIndustryCategory(
          findIndustryCategory(data.tenant.industry) ||
            (data.tenant.industry ? UNMATCHED_INDUSTRY_CATEGORY : ""),
        );
        setProfile(data);
      } catch (err) {
        if (isAbortError(err)) return;
        setFormError(
          err instanceof ApiError ? err.message : "Failed to load profile",
        );
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    };

    void loadProfile();
    return () => controller.abort();
  }, [reset]);

  const onSubmit = async (values: ProfileFormValues) => {
    setFormMessage(null);
    setFormError(null);
    setSaving(true);
    try {
      const payload: TenantProfilePayload = {
        name: values.name,
        timezone: values.timezone,
        industry: values.industry,
        country: values.country,
        default_email_recipients: values.default_email_recipients
          .split(",")
          .map((e) => e.trim())
          .filter(Boolean),
      };
      const response = await tenantApi.updateProfile(payload);
      const updated = { ...profile!, tenant: response.tenant };
      apiCache.set(CACHE_KEYS.tenantProfile, updated);
      apiCache.delete(CACHE_KEYS.phoneNumbers); // dashboard re-reads profile
      setProfile(updated);
      setFormMessage("Profile updated successfully");
      setIsEditing(false);
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : "Failed to update profile",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (!profile) return;
    setIsEditing(false);
    setFormMessage(null);
    setFormError(null);
    reset({
      name: profile.tenant.name,
      timezone: profile.tenant.timezone,
      industry: profile.tenant.industry,
      country: profile.tenant.country || DEFAULT_COUNTRY,
      default_email_recipients:
        profile.tenant.default_email_recipients.join(", "),
    });
    setIndustryCategory(
      findIndustryCategory(profile.tenant.industry) ||
        (profile.tenant.industry ? UNMATCHED_INDUSTRY_CATEGORY : ""),
    );
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="page-hero">
          <div>
            <div
              className="skeleton-block"
              style={{ width: 180, height: 26, marginBottom: 8 }}
            />
            <div
              className="skeleton-block"
              style={{ width: 120, height: 18 }}
            />
          </div>
        </div>
        <div
          className="skeleton-block"
          style={{ height: 200, borderRadius: 14 }}
        />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="dashboard-page">
        <div className="page-hero">
          <h1>Tenant Profile</h1>
        </div>
        <div className="form-status error">
          Failed to load profile. Please refresh.
        </div>
      </div>
    );
  }

  const tenant = profile.tenant;
  const canEdit =
    profile.user_role === "owner" || profile.user_role === "admin";
  const roleBadgeClass =
    profile.user_role === "owner"
      ? "badge-info"
      : profile.user_role === "admin"
        ? "badge-neutral"
        : "badge-neutral";

  return (
    <div className="dashboard-page">
      {/* Header */}
      <div className="page-hero">
        <div>
          <h1>Tenant Profile</h1>
          <p className="page-subtitle">
            Company information and account settings
          </p>
        </div>
        <div className="page-hero-badges">
          <span className={`badge ${roleBadgeClass}`}>{profile.user_role}</span>
          <span
            className={`badge badge-${tenant.status === "active" ? "success" : "warning"}`}
          >
            <span className="badge-dot" />
            {tenant.status}
          </span>
        </div>
      </div>

      {formMessage && (
        <div className="form-status" style={{ marginBottom: 16 }}>
          {formMessage}
        </div>
      )}
      {formError && (
        <div className="form-status error" style={{ marginBottom: 16 }}>
          {formError}
        </div>
      )}

      {!isEditing ? (
        /* ── Read-only view ── */
        <>
          <div className="detail-card">
            <div className="detail-card-header">
              <h2 className="detail-card-title">Company Details</h2>
              {canEdit && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="dashboard-button"
                >
                  <IconEdit /> Edit Profile
                </button>
              )}
            </div>
            <div className="detail-card-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Company Name</span>
                  <span className="detail-value">{tenant.name}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Industry</span>
                  <span className="detail-value">{tenant.industry || "—"}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Timezone</span>
                  <span className="detail-value">{tenant.timezone || "—"}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Country</span>
                  <span className="detail-value">
                    {countryName(tenant.country)}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Account Status</span>
                  <span className="detail-value">
                    <span
                      className={`badge badge-${tenant.status === "active" ? "success" : "warning"}`}
                    >
                      <span className="badge-dot" />
                      {tenant.status}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="detail-card">
            <div className="detail-card-header">
              <h2 className="detail-card-title">Call Report Recipients</h2>
            </div>
            <div className="detail-card-body">
              {tenant.default_email_recipients.length > 0 ? (
                <>
                  <p
                    style={{
                      margin: "0 0 12px",
                      fontSize: "0.875rem",
                      color: "var(--text-muted)",
                    }}
                  >
                    After each call, a summary, transcript and recording link
                    are emailed to:
                  </p>
                  <div className="detail-tags">
                    {tenant.default_email_recipients.map((email) => (
                      <span key={email} className="detail-tag">
                        {email}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.875rem",
                    color: "var(--text-muted)",
                  }}
                >
                  No email recipients configured. Edit your profile to add
                  recipients.
                </p>
              )}
            </div>
          </div>

          <div className="detail-card">
            <div className="detail-card-header">
              <h2 className="detail-card-title">Account Information</h2>
            </div>
            <div className="detail-card-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Your Role</span>
                  <span className="detail-value">
                    <span className={`badge ${roleBadgeClass}`}>
                      {profile.user_role}
                    </span>
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Created</span>
                  <span className="detail-value">
                    {new Date(tenant.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* ── Edit form ── */
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="form-sections">
            <div className="form-section">
              <div className="form-section-header">
                <h2 className="form-section-title">Company Details</h2>
                <p className="form-section-desc">
                  Basic information about your company
                </p>
              </div>
              <div className="form-section-body form-grid-2">
                <div className="form-field">
                  <label htmlFor="name">Company Name</label>
                  <input
                    id="name"
                    type="text"
                    {...register("name")}
                    placeholder="Acme Corp"
                  />
                  {errors.name && (
                    <small className="field-error">{errors.name.message}</small>
                  )}
                </div>

                <div className="form-field">
                  <label htmlFor="industry_category">Industry Category</label>
                  <select
                    id="industry_category"
                    className="form-field-select"
                    value={industryCategory}
                    onChange={(e) =>
                      handleIndustryCategoryChange(e.target.value)
                    }
                  >
                    <option value="">Select category…</option>
                    {industryCategoryOptions.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="industry">Industry</label>
                  <select
                    id="industry"
                    className="form-field-select"
                    disabled={!industryCategory}
                    {...register("industry")}
                  >
                    <option value="">
                      {industryCategory
                        ? "Select industry…"
                        : "Select a category first…"}
                    </option>
                    {industrySubOptions.map((ind) => (
                      <option key={ind} value={ind}>
                        {ind}
                      </option>
                    ))}
                  </select>
                  {errors.industry && (
                    <small className="field-error">
                      {errors.industry.message}
                    </small>
                  )}
                </div>

                <div className="form-field">
                  <label htmlFor="timezone">Timezone</label>
                  <select
                    id="timezone"
                    className="form-field-select"
                    {...register("timezone")}
                  >
                    <option value="">Select timezone…</option>
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                  {errors.timezone && (
                    <small className="field-error">
                      {errors.timezone.message}
                    </small>
                  )}
                </div>

                <div className="form-field">
                  <label htmlFor="country">Country</label>
                  <select
                    id="country"
                    className="form-field-select"
                    {...register("country")}
                  >
                    <option value="">Select country…</option>
                    {countries.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                  {errors.country && (
                    <small className="field-error">
                      {errors.country.message}
                    </small>
                  )}
                  <small
                    style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}
                  >
                    New phone numbers can only be purchased in this country.
                  </small>
                </div>
              </div>
            </div>

            <div className="form-section">
              <div className="form-section-header">
                <h2 className="form-section-title">Call Report Recipients</h2>
                <p className="form-section-desc">
                  After each call, a summary and transcript are emailed to these
                  addresses
                </p>
              </div>
              <div className="form-section-body">
                <div className="form-field">
                  <label htmlFor="default_email_recipients">
                    Email Addresses
                  </label>
                  <input
                    id="default_email_recipients"
                    type="text"
                    {...register("default_email_recipients")}
                    placeholder="admin@company.com, reports@company.com"
                  />
                  {errors.default_email_recipients && (
                    <small className="field-error">
                      {errors.default_email_recipients.message}
                    </small>
                  )}
                  <small
                    style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}
                  >
                    Separate multiple emails with commas
                  </small>
                </div>
              </div>
            </div>

            <div
              className="dashboard-form-actions"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                padding: "16px 20px",
                marginTop: 0,
              }}
            >
              <button
                type="button"
                onClick={handleCancelEdit}
                className="dashboard-button-secondary"
              >
                <IconX /> Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="dashboard-button"
              >
                <IconSave /> {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
