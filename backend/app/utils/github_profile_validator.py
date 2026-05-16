import httpx
from app.services.github_service import GitHubServiceError


class GitHubProfileValidator:
    """
    Validates GitHub usernames and fetches basic profile information.
    Uses GitHub API to verify user exists and retrieve profile details.
    """

    BASE_URL = "https://api.github.com"
    TIMEOUT = 10.0

    @staticmethod
    async def validate_and_fetch_profile(username: str) -> dict:
        """
        Validate GitHub username exists and fetch profile details.

        Returns:
            dict with keys: username, profile_url, avatar_url, display_name

        Raises:
            GitHubServiceError: if username doesn't exist or API request fails
        """
        if not username or not isinstance(username, str):
            raise GitHubServiceError(
                "Invalid GitHub username format.",
                status_code=400
            )

        try:
            async with httpx.AsyncClient(timeout=GitHubProfileValidator.TIMEOUT) as client:
                response = await client.get(
                    f"{GitHubProfileValidator.BASE_URL}/users/{username}",
                    headers={"Accept": "application/vnd.github+json"}
                )

                if response.status_code == 404:
                    raise GitHubServiceError(
                        f"GitHub user '{username}' not found.",
                        status_code=404
                    )

                if response.status_code == 403:
                    raise GitHubServiceError(
                        "GitHub API rate limit exceeded. Please try again later.",
                        status_code=429
                    )

                if not response.is_success:
                    raise GitHubServiceError(
                        "Unable to verify GitHub username. Please try again.",
                        status_code=response.status_code
                    )

                user_data = response.json()

                return {
                    "username": user_data.get("login"),
                    "profile_url": user_data.get("html_url"),
                    "avatar_url": user_data.get("avatar_url"),
                    "display_name": user_data.get("name"),
                }

        except httpx.TimeoutException:
            raise GitHubServiceError(
                "GitHub API request timed out. Please try again.",
                status_code=504
            )
        except httpx.RequestError as exc:
            raise GitHubServiceError(
                "Unable to reach GitHub API. Please try again shortly.",
                status_code=502
            ) from exc
        except ValueError as exc:
            raise GitHubServiceError(
                "Invalid response from GitHub API.",
                status_code=502
            ) from exc
