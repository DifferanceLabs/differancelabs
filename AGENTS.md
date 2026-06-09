# Differance Labs Agent Instructions

## Project

This repository powers differancelabs.com.

## Hosting

Production is deployed on Vercel from the GitHub repository:
DifferanceLabs/differancelabs

## Deployment Flow

- Changes should be committed and pushed to the main branch on GitHub.
- Vercel automatically deploys production from main.
- Do not manually upload files to Vercel.
- Do not create a separate local git repository.
- Do not change Cloudflare DNS unless explicitly asked.
- Cloudflare manages DNS for differancelabs.com.
- Vercel hosts the site.

## Current Domains

- differancelabs.com
- www.differancelabs.com
- differancelabs.vercel.app

## Site Intent

The public homepage should remain minimal, quiet, and generic.
Do not add navigation, project links, public contact forms, or references to AdMe, NomNomGo, PIE, Divvi, or other projects unless explicitly asked.

## Safe Update Process

Before making changes:

1. Inspect the repository.
2. Explain the intended change.
3. Edit the minimum files required.
4. Commit and push to GitHub.
5. Confirm Vercel auto-deployed successfully.

## Design Direction

Dark, understated, premium, private-lab feel.

Think:

- research institute
- skunkworks
- private workshop
- incubator

Avoid:

- marketing site
- consulting company
- startup hype
- AI buzzword aesthetic

## Future Architecture

Differance Labs is an incubator and launcher for independent projects.

The long-term structure is:

- differancelabs.com (public homepage)
- admin.differancelabs.com (private control plane)
- adme.differancelabs.com
- nomnomgo.differancelabs.com
- pie.differancelabs.com
- divvi.differancelabs.com

Projects should be designed so they can later move to their own domains without depending on Differance Labs infrastructure.

## Authentication Vision

The ∆ logo on the homepage may eventually link to a Google login flow.

After login, users may see an application launcher showing only the apps they have access to.

This launcher is an access portal for alpha/beta use and administration.

Production applications should eventually support their own independent authentication systems and must not permanently depend on Differance Labs login.

## Repository Governance

This AGENTS.md file is authoritative project context.

Before making significant changes:

- Read AGENTS.md.
- Follow deployment instructions.
- Preserve the site's minimalist intent unless explicitly instructed otherwise.
- Keep architecture decisions documented here as the project evolves.
