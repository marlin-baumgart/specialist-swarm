"""
Run the MCP Server Builder swarm against a chosen API spec tier.

Lets the team pick a complexity tier (simple / medium / complex), loads the
matching OpenAPI spec and feature requirements, then streams events so you
can watch the two-phase fan-out in action.

Saves the final transcript and deliverables to outputs/.

Usage:
    python run_mcp_builder.py              # interactive tier selection
    python run_mcp_builder.py simple       # skip prompt, use simple tier
    python run_mcp_builder.py medium
    python run_mcp_builder.py complex
"""

import os
import sys
from pathlib import Path

from anthropic import Anthropic


TIERS = {
    "simple": {
        "api_spec": Path("synthetic-data/api-specs/weather-notifications-api.yaml"),
        "feature_reqs": Path("synthetic-data/feature-requirements-simple.md"),
        "label": "Weather & Notifications API (~5 endpoints)",
    },
    "medium": {
        "api_spec": Path("synthetic-data/api-specs/project-management-api.yaml"),
        "feature_reqs": Path("synthetic-data/feature-requirements-medium.md"),
        "label": "Project Management API (~15 endpoints)",
    },
    "complex": {
        "api_spec": Path("synthetic-data/api-specs/ecommerce-inventory-api.yaml"),
        "feature_reqs": Path("synthetic-data/feature-requirements-complex.md"),
        "label": "E-Commerce & Inventory API (~30 endpoints)",
    },
}

OUTPUT_DIR = Path("outputs")


def pick_tier() -> str:
    """Let the user pick a tier, or accept it from argv."""
    if len(sys.argv) > 1:
        tier = sys.argv[1].lower()
        if tier in TIERS:
            return tier
        print(f"Unknown tier '{tier}'. Choose from: simple, medium, complex")
        sys.exit(1)

    print("Pick an API complexity tier:\n")
    for key, info in TIERS.items():
        print(f"  {key:8s}  {info['label']}")
    print()

    while True:
        choice = input("Tier [simple/medium/complex]: ").strip().lower()
        if choice in TIERS:
            return choice
        print("  Invalid choice. Try again.")


def load_inputs(tier: str) -> str:
    """Load the OpenAPI spec and feature requirements for the chosen tier."""
    info = TIERS[tier]
    blocks = []

    for label, path in [
        ("OPENAPI SPECIFICATION", info["api_spec"]),
        ("FEATURE REQUIREMENTS", info["feature_reqs"]),
    ]:
        if not path.exists():
            raise SystemExit(f"Missing file: {path}")
        print(f"  including {path.name}")
        blocks.append(f"=====  {label}  =====\n{path.read_text()}")

    return "\n\n".join(blocks)


def main() -> None:
    if not os.environ.get("ANTHROPIC_API_KEY"):
        raise SystemExit("Set ANTHROPIC_API_KEY before running.")

    if not Path(".mcp_coordinator_id").exists() or not Path(".environment_id").exists():
        raise SystemExit(
            "Missing .mcp_coordinator_id or .environment_id. Run "
            "create_mcp_specialists.py, upload_mcp_skills.py, then "
            "create_mcp_coordinator.py first."
        )

    coordinator_id = Path(".mcp_coordinator_id").read_text().strip()
    environment_id = Path(".environment_id").read_text().strip()

    tier = pick_tier()
    tier_info = TIERS[tier]

    client = Anthropic()

    print(f"\nLoading {tier} tier: {tier_info['label']}...")
    context = load_inputs(tier)

    print(f"\nStarting session against coordinator {coordinator_id}...")
    session = client.beta.sessions.create(
        agent=coordinator_id,
        environment_id=environment_id,
        title=f"MCP Server Builder — {tier_info['label']}",
    )
    Path(".last_session_id").write_text(session.id)

    user_message = (
        "A new MCP server build request has arrived. Run the standard "
        "two-phase fan-out process:\n\n"
        "## Phase 1 — Analysis (parallel)\n"
        "1. Send the OpenAPI spec to the API Analyst for capability mapping.\n"
        "2. Send the feature requirements to the MCP Architect for schema design.\n\n"
        "## Phase 2 — Implementation (sequential)\n"
        "3. Send both outputs to the Code Generator to produce the full "
        "TypeScript MCP server project.\n\n"
        "## Phase 3 — Polish (parallel)\n"
        "4. Send the code to the Documentation Writer for README + Group IT docx.\n"
        "5. Send the code + MCP design doc to the QA Validator for review.\n\n"
        "## Assembly\n"
        "6. Apply any critical QA fixes, merge docs, and produce the final "
        "repo at outputs/mcp-server/ plus outputs/mcp-server-documentation.docx.\n\n"
        "Specialists have their own skills attached. Move fast but be "
        "thorough — the output must actually run.\n\n"
        f"{context}"
    )

    # Stream the events — this is the demo. Watch for parallel thread spawns.
    print("\n=== EVENT STREAM (this is the demo) ===\n")
    final_text_parts: list[str] = []

    with client.beta.sessions.events.stream(session.id) as stream:
        client.beta.sessions.events.send(
            session.id,
            events=[
                {
                    "type": "user.message",
                    "content": [{"type": "text", "text": user_message}],
                }
            ],
        )
        for event in stream:
            t = event.type
            if t == "session.thread_created":
                print(f"  [thread spawned]   {event.agent_name}", flush=True)
            elif t == "session.thread_status_running":
                name = getattr(event, "agent_name", "?")
                print(f"  [thread running]   {name}", flush=True)
            elif t == "agent.thread_message_received":
                print(f"  [reply <-]         {event.from_agent_name}", flush=True)
            elif t == "agent.thread_message_sent":
                print(f"  [delegate ->]      {event.to_agent_name}", flush=True)
            elif t == "agent.message":
                for block in event.content:
                    if getattr(block, "type", None) == "text":
                        final_text_parts.append(block.text)
                        print(block.text, end="", flush=True)
            elif t == "agent.tool_use":
                print(f"\n  [tool: {getattr(event, 'name', '?')}]", flush=True)
            elif t == "session.status_idle":
                print("\n\n[swarm finished]")
                break

    OUTPUT_DIR.mkdir(exist_ok=True)
    transcript_path = OUTPUT_DIR / "mcp-builder-transcript.txt"
    transcript_path.write_text("".join(final_text_parts))
    print(f"\nCoordinator transcript saved to {transcript_path}")

    # Pull every file the agents produced in the container
    print("\nDownloading deliverables from the session container...")
    files = client.beta.files.list(
        scope_id=session.id,
        betas=["managed-agents-2026-04-01"],
    )
    file_count = 0
    for f in files.data:
        out_path = OUTPUT_DIR / f.filename
        print(f"  {f.filename}  ->  {out_path}")
        content = client.beta.files.download(f.id)
        content.write_to_file(str(out_path))
        file_count += 1

    if file_count == 0:
        print("  (no files found — agents may have produced text-only output)")
    else:
        print(f"\nDownloaded {file_count} file(s) to {OUTPUT_DIR}/")

    print(f"\nView the full session (including all sub-agent threads) at:")
    print(f"  https://platform.claude.com/sessions/{session.id}")


if __name__ == "__main__":
    main()
