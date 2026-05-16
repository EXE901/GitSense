import os
from pathlib import Path

import httpx
from dotenv import load_dotenv
from fastapi import HTTPException, status

ENV_FILE_PATH = Path(__file__).resolve().parents[2] / ".env"
RESEND_EMAIL_URL = "https://api.resend.com/emails"

load_dotenv(dotenv_path=ENV_FILE_PATH, override=False)


class EmailService:
    def __init__(self) -> None:
        self.resend_api_key = os.getenv("RESEND_API_KEY")
        self.from_email = os.getenv("RESEND_FROM_EMAIL", "GitSense <no-reply@gitsense.tech>")

    def is_configured(self) -> bool:
        return bool(self.resend_api_key and self.from_email)

    async def send_verification_email(self, to_email: str, verification_url: str) -> None:
        await self._send_email(
            to_email=to_email,
            subject="Verify your GitSense email",
            text=(
                "Verify your GitSense email to unlock unlimited repository synchronization.\n\n"
                f"Open this secure link to verify your email: {verification_url}\n\n"
                "This link expires in 24 hours."
            ),
        )

    async def send_password_reset_email(self, to_email: str, reset_url: str) -> None:
        await self._send_email(
            to_email=to_email,
            subject="Reset your GitSense password",
            text=(
                "We received a request to reset your GitSense password.\n\n"
                f"Open this secure link to choose a new password: {reset_url}\n\n"
                "This link expires in 30 minutes. If you did not request this, you can ignore this email."
            ),
        )

    async def _send_email(self, to_email: str, subject: str, text: str) -> None:
        if not self.is_configured():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Resend email delivery is not configured.",
            )

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(
                    RESEND_EMAIL_URL,
                    headers={
                        "Authorization": f"Bearer {self.resend_api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "from": self.from_email,
                        "to": [to_email],
                        "subject": subject,
                        "text": text,
                    },
                )
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Unable to reach Resend email delivery.",
            ) from exc

        if response.status_code >= 400:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Resend could not deliver the email.",
            )
