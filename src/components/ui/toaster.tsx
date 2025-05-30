"use client"

import {
  Toaster as ChakraToaster,
  Portal,
  Spinner,
  Stack,
  Toast,
  createToaster,
} from "@chakra-ui/react"

export const toaster = createToaster({
  placement: "bottom-end",
  pauseOnPageIdle: true,
  max: 3
})

export const Toaster = () => {
  return (
    <Portal>
      <ChakraToaster toaster={toaster} insetInline={{ mdDown: "4" }}>
        {(toast) => { 
          const color = String(toast.title).indexOf("Error") > -1 ? "#eb0c0c" : "auto"
          return (
            <Toast.Root width={{ md: "sm" }} backgroundColor={"#222831"} >
            {toast.type === "loading" ? (
              <Spinner size="sm" color="blue.solid" />
            ) : (
              <Toast.Indicator />
            )}
            <Stack gap="1" flex="1" maxWidth="100%" p={2} >
              {toast.title && <Toast.Title color={color} fontWeight={"bold"}>{toast.title}</Toast.Title>}
              {toast.description && (
                <Toast.Description whiteSpace="pre-wrap">
                  {toast.description}
                </Toast.Description>
              )}
            </Stack>
            {toast.action && (
              <Toast.ActionTrigger>{toast.action.label}</Toast.ActionTrigger>
            )}
            {toast.meta?.closable && <Toast.CloseTrigger />}
          </Toast.Root>
        )}}
      </ChakraToaster>
    </Portal>
  )
}
