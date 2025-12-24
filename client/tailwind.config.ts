import type { Config } from "tailwindcss";

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
    extend: {
      fontFamily: {
        geist: ['Geist', 'system-ui', 'sans-serif'],
        sans: ['Geist', 'system-ui', 'sans-serif'],
        mono: ['Geist Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        // Display sizes
        'display-lg': ['3.75rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],  // 60px
        'display': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],        // 48px
        'display-sm': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],  // 36px
        // Heading sizes
        'heading-xl': ['1.875rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }], // 30px
        'heading-lg': ['1.5rem', { lineHeight: '1.3', letterSpacing: '-0.01em' }],   // 24px
        'heading': ['1.25rem', { lineHeight: '1.4' }],                                // 20px
        'heading-sm': ['1.125rem', { lineHeight: '1.4' }],                            // 18px
        // Body sizes
        'body-lg': ['1.125rem', { lineHeight: '1.6' }],   // 18px
        'body': ['1rem', { lineHeight: '1.6' }],          // 16px
        'body-sm': ['0.875rem', { lineHeight: '1.5' }],   // 14px
        // Small sizes
        'label': ['0.875rem', { lineHeight: '1.4', fontWeight: '500' }],  // 14px
        'caption': ['0.75rem', { lineHeight: '1.4' }],    // 12px
        'overline': ['0.75rem', { lineHeight: '1.4', letterSpacing: '0.05em' }], // 12px
      },
      colors: {
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
          light: "var(--primary-light)",
          dark: "var(--primary-dark)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        success: {
          DEFAULT: "var(--color-success)",
          foreground: "var(--success-foreground)",
        },
        warning: {
          DEFAULT: "var(--color-warning)",
          foreground: "var(--warning-foreground)",
        },
        info: {
          DEFAULT: "var(--color-info)",
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
      },
      borderColor: {
        DEFAULT: "var(--border)",
      },
      borderRadius: {
        lg: "var(--radius-lg)",    /* 24px - Cards, modals, large containers */
        md: "var(--radius-md)",    /* 16px - Medium elements */
        DEFAULT: "var(--radius)",  /* 12px - Default/buttons */
        sm: "var(--radius-sm)",    /* 8px - Small elements, tags */
        xl: "var(--radius-xl)",    /* 32px - Extra large */
        full: "var(--radius-full)", /* Pill shape */
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
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
