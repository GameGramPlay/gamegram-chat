'use client'

import * as React from 'react'
import { IconButton, Skeleton, Box } from '@chakra-ui/react'
import { ThemeProvider, useTheme } from 'next-themes'
import { LuMoon, LuSun } from 'react-icons/lu'
import { ClientOnly } from './ClientOnly.jsx'

// Wrap the app with this provider
export function ColorModeProvider({ children }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      disableTransitionOnChange
      enableSystem={false}
    >
      {children}
    </ThemeProvider>
  )
}

// Hook to access theme
export function useColorMode() {
  const { resolvedTheme, setTheme, forcedTheme } = useTheme()
  const colorMode = forcedTheme || resolvedTheme

  const toggleColorMode = () => {
    setTheme(colorMode === 'dark' ? 'light' : 'dark')
  }

  return { colorMode, setColorMode: setTheme, toggleColorMode }
}

// Return value based on theme
export function useColorModeValue(light, dark) {
  const { colorMode } = useColorMode()
  return colorMode === 'dark' ? dark : light
}

// Icon showing current mode
export function ColorModeIcon({ size = 18 }) {
  const { colorMode } = useColorMode()
  return colorMode === 'dark' ? (
    <LuMoon size={size} />
  ) : (
    <LuSun size={size} />
  )
}

// Discord-style toggle button
export const ColorModeButton = React.forwardRef(function ColorModeButton(props, ref) {
  const { toggleColorMode, colorMode } = useColorMode()

  return (
    <ClientOnly fallback={<Skeleton boxSize="8" />}>
      <IconButton
        onClick={toggleColorMode}
        ref={ref}
        aria-label="Toggle color mode"
        size="sm"
        variant="ghost"
        borderRadius="full"
        bg={colorMode === 'dark' ? '#36393f' : '#f2f3f5'}
        color={colorMode === 'dark' ? 'white' : 'black'}
        _hover={{
          bg: colorMode === 'dark' ? '#4f545c' : '#e3e5e8',
          transform: 'scale(1.1)',
          transition: 'all 0.15s ease-in-out',
        }}
        _active={{
          bg: colorMode === 'dark' ? '#4f545c' : '#d9dadc',
          transform: 'scale(0.95)',
        }}
        icon={<ColorModeIcon size={16} />}
        {...props}
      />
    </ClientOnly>
  )
})

// Light mode wrapper
export const LightMode = React.forwardRef(function LightMode(props, ref) {
  return <Box className="chakra-theme light" ref={ref} {...props} />
})

// Dark mode wrapper
export const DarkMode = React.forwardRef(function DarkMode(props, ref) {
  return <Box className="chakra-theme dark" ref={ref} {...props} />
})
