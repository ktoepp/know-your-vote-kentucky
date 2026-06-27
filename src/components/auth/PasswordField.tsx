'use client';

import { useState } from 'react';
import { IconButton, InputAdornment, TextField } from '@mui/material';
import type { TextFieldProps } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';

/**
 * Password input with a show/hide reveal toggle. The toggle is a real focusable
 * button with a state-describing `aria-label` + `aria-pressed` (WCAG 4.1.2); the
 * theme's `MuiIconButton` 44×44 floor covers target size (WCAG 2.5.5). Forwards
 * all other `TextField` props; `type` is managed internally.
 */
export function PasswordField(props: Omit<TextFieldProps, 'type'>) {
  const [show, setShow] = useState(false);
  return (
    <TextField
      {...props}
      type={show ? 'text' : 'password'}
      InputProps={{
        ...props.InputProps,
        endAdornment: (
          <InputAdornment position="end">
            <IconButton
              aria-label={show ? 'Hide password' : 'Show password'}
              aria-pressed={show}
              onClick={() => setShow((s) => !s)}
              edge="end"
            >
              {show ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );
}
