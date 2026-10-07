from pydantic import BaseModel

class SettingsResponse(BaseModel):
    theme: str
    model: str
    enter_to_send: bool
    show_sources: bool
    auto_scroll: bool

class SettingsUpdate(BaseModel):
    theme: str | None = None
    model: str | None = None
    enter_to_send: bool | None = None
    show_sources: bool | None = None
    auto_scroll: bool | None = None
