"""Global hotkey listener using pynput."""
from __future__ import annotations
from typing import Callable
from pynput import keyboard


class HotkeyManager:
    def __init__(self):
        self._callbacks: dict[frozenset, Callable] = {}
        self._listener: keyboard.GlobalHotKeys | None = None

    def register(self, hotkey: str, callback: Callable) -> None:
        """Register a hotkey string like '<ctrl>+<shift>+p'."""
        self._callbacks[hotkey] = callback

    def start(self) -> None:
        if self._listener:
            self._listener.stop()
        self._listener = keyboard.GlobalHotKeys(self._callbacks)
        self._listener.start()

    def stop(self) -> None:
        if self._listener:
            self._listener.stop()
            self._listener = None
