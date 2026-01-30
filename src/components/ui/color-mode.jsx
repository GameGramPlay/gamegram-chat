'use client'

import * as React from 'react'
import { IconButton, Skeleton } from '@chakra-ui/react'
import { ThemeProvider, useTheme } from 'next-themes'
import { LuMoon, LuSun } from 'react-icons/lu'
import { ClientOnly } from './ClientOnly.jsx' // make sure you have this component

// Provider to wrap your app
export function ColorModeProvider({ children }) {
  return (
    <ThemeProvider
      attribute="class"
      disableTransitionOnChange
      defaultTheme="dark"
      enableSystem={false}
    >
      {children}
    </ThemeProvider>
  )
}

// Hook to use color mode
export function useColorMode() {
  const { resolvedTheme, setTheme, forcedTheme } = useTheme()
  const colorMode = forcedTheme || resolvedTheme

  const toggleColorMode = () => {
    setTheme(colorMode === 'dark' ? 'light' : 'dark')
  }

  return {
    colorMode,
    setColorMode: setTheme,
    toggleColorMode,
  }
}

// Hook to select value based on theme
export function useColorModeValue(light, dark) {
  const { colorMode } = useColorMode()
  return colorMode === 'dark' ? dark : light
}

// Icon that shows current mode
export function ColorModeIcon() {
  const { colorMode } = useColorMode()
  return colorMode === 'dark' ? <LuMoon /> : <LuSun />
}

// Button to toggle color mode
export const ColorModeButton = React.forwardRef(function ColorModeButton(props, ref) {
  const { toggleColorMode } = useColorMode()

  return (
    <ClientOnly fallback={<Skeleton boxSize="8" />}>
      <IconButton
        onClick={toggleColorMode}
        variant="ghost"
        aria-label="Toggle color mode"
        size="sm"
        ref={ref}
        {...props}
      >
        <ColorModeIcon />
      </IconButton>
    </ClientOnly>
  )
})

// Light mode wrapper
export const LightMode = React.forwardRef(function LightMode(props, ref) {
  return (
    <span
      className="chakra-theme light"
      ref={ref}
      {...props}
    />
  )
})

// Dark mode wrapper
export const DarkMode = React.forwardRef(function DarkMode(props, ref) {
  return (
    <span
      className="chakra-theme dark"
      ref={ref}
      {...props}
    />
  )
})
