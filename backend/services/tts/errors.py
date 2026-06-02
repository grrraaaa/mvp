class TtsNotConfiguredError(Exception):
    pass


class TtsProviderError(Exception):
    def __init__(self, message: str, status_code: int | None = None):
        super().__init__(message)
        self.status_code = status_code
