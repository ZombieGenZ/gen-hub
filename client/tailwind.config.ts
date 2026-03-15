import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    fontFamily: {
      sans: ['var(--font-rem)', 'system-ui', 'sans-serif'],
      mono: ['var(--font-jetbrains-mono)', 'ui-monospace', 'monospace'],
    },
    extend: {

      fontSize: {
        'display-lg': ['3.75rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],  // 60px
        'display': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],        // 48px
        'display-sm': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],  // 36px
        'headline-lg': ['2rem', { lineHeight: '1.3', fontWeight: '700' }],      // 32px (User Rule: Headline Large, 130%)
        'headline-md': ['1.5rem', { lineHeight: '1.3', fontWeight: '600' }],    // 24px
        'headline-sm': ['1.25rem', { lineHeight: '1.3', fontWeight: '600' }],   // 20px (User Rule: Headline Medium, 130%)
        'body-lg': ['1.125rem', { lineHeight: '1.6' }],   // 18px
        'body': ['1rem', { lineHeight: '1.5' }],          // 16px (User Rule: Body Large, 150%)
        'body-sm': ['0.875rem', { lineHeight: '1.5' }],   // 14px
        // Small sizes
        'label': ['0.875rem', { lineHeight: '1.4', fontWeight: '500' }],  // 14px
        'caption': ['0.75rem', { lineHeight: '1.5' }],    // 12px (User Rule: Body Small, 150%)
        'overline': ['0.75rem', { lineHeight: '1.4', letterSpacing: '0.05em' }], // 12px
      },
      colors: {
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "#0F766E", // Explicitly set Primary Color
          foreground: "#FFFFFF",
          light: "#14b8a6", // teal-500 approx
          dark: "#0d6e66",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--chart-2)", // Rose
          foreground: "var(--destructive-foreground)",
        },
        success: {
          DEFAULT: "var(--chart-1)", // Teal
          foreground: "var(--success-foreground)",
        },
        warning: {
          DEFAULT: "var(--chart-3)", // Orange
          foreground: "var(--warning-foreground)",
        },
        info: {
          DEFAULT: "var(--chart-4)", // Purple
          foreground: "var(--info-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        sidebar: {
          DEFAULT: "var(--secondary)", // Mapping to secondary as per globals
          foreground: "var(--foreground)",
          primary: "var(--primary)",
          "primary-foreground": "var(--primary-foreground)",
          accent: "var(--accent)",
          "accent-foreground": "var(--accent-foreground)",
          border: "var(--border)",
          ring: "var(--ring)",
        },
        chart: {
          1: "var(--chart-1)",
          2: "var(--chart-2)",
          3: "var(--chart-3)",
          4: "var(--chart-4)",
          5: "var(--chart-5)",
        }
      },
      borderColor: {
        DEFAULT: "var(--border)",
      },
      borderRadius: {
        lg: "24px",     /* Large: 24px */
        md: "16px",     /* Medium: 16px */
        sm: "12px",     /* Smallest: 12px (Renamed from default/sm mapping) */
        DEFAULT: "12px",
        xl: "32px",
        full: "9999px",
      },
      spacing: {
        'sidebar': 'var(--sidebar-width)',
        'sidebar-collapsed': 'var(--sidebar-width-collapsed)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
