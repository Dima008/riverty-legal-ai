# Riverty Interview Challenge – original text

Source: file "Software Engineer (RAG) Case Study", plus Riverty's addendum of 2026-10-29.
Verbatim; mirrored from the Notion page "Case Study (Original)".

## Introduction

Dear Applicant,

**Congratulations—you have made it to the Riverty Interview Challenge!**

Why do we ask you to complete this challenge?

This challenge helps us get a more holistic picture of your skills, your way of thinking, and
how you approach real-world problems. It complements the interview by giving you the
opportunity to demonstrate your strengths in a practical and creative way.

We also want to be transparent about what we value and how we assess solutions. By sharing
this challenge with you, we aim to create a fair and engaging experience that allows you to
showcase your ideas, your technical approach, and your personal style. Ultimately, this
challenge is designed to give you the space to shine and to start a meaningful conversation
during the interview.

What do we expect from you as preparation?

You should be able to present your solution in 15–20 minutes during the interview. The format
of your presentation is up to you. Of course, it can help to create a small slide deck to
support your presentation, but remember we want to get to know you, not only your slides.

## Problem description

Over the last couple of years, AI has become a major driver of innovation. More and more
corporations see an advantage in leveraging it to become more productive. While a technical
definition of productivity is often rather complicated, it is economically easy to describe:
create more with the same number of engineers.

This is also true for Riverty. However, we like to take on the challenges set by management
and find creative and innovative technical solutions to succeed—while learning and improving
ourselves at the same time.

One of these challenges is making our legal team more efficient. While there is a lot of talk
about agents like Claude being able to help, in day-to-day operations they often fail due to
the sheer size and complexity of the environments they have to operate in.

## Technical outline

Our legal colleagues currently leverage a variety of tools, but the main workload still
consists of organizing and reviewing contracts, comparing them, and ensuring they comply with
our corporate guidelines and represent the company's best interests.

Most documents reside on SharePoint and are in PDF format. Some of them are scans of really
old, handwritten contracts that exist only as JPEG files. Additionally, there is a contract
storage solution with a RESTful API. You may solely use it to store an additional copy of a
contract in a legally compliant manner.

Riverty follows two guiding principles when it comes to technology choices. First, we
evaluate best-of-breed solutions and what they offer. Second, as we are a Microsoft shop, we
compare these solutions against what Microsoft provides.

As a result, we currently often use the following technologies:

- Azure
- Azure Foundry / Google Gemini
- Containerized environments
- Python with FastAPI and multiple libraries
- Terraform for infrastructure provisioning
- Frontend written in React and TypeScript
- LangChain and LangGraph for agents

## The task

Our legal colleagues regularly need to compare contracts and identify, for example, contracts
that do not contain a certain text passage or contracts in which a company name needs to be
updated.

So far, this is semi-manual work: they have to open the documents, search for the relevant
content, and verify the results themselves.

They approached us to ask whether AI could help with this task, as it is purely repetitive
work that nobody enjoys doing.

Your task is to come up with the following:

**Presentation outlining:**

- A solution explaining how you would tackle the challenge
- An overall technical solution you would present to our team and how it could be implemented
- A basic explanation of the infrastructure you would leverage
- A concept for helping our colleagues adopt the solution and ensure they get the most value
  out of it
- Anything else you feel is relevant to understanding your approach to solving the challenge

**Basic implementation demonstrating the foundation of the concept, including:**

- A basic pipeline showing how you would analyze the documents and make them accessible
- A basic front-end demonstrating how the solution can be used
- Anything you feel is necessary to demonstrate the end-to-end workflow

As a team, we encourage any form of AI usage, as long as we understand what is happening. As
our future teammate, we encourage you to do the same.

## Addendum from Riverty (2026-10-29)

Unfortunately, we won't be able to share actual contracts or contract templates, as these are
confidential.

However, to give you some context, Riverty works with over 100 vendors on the inbound side and
over 1,000 merchants on the outbound side. These agreements cover both B2B and B2B2C business
models and are managed in collaboration with our Legal team.

For the purpose of the case study, feel free to use any publicly available B2B or B2B2C
contract or contract template you find online as a reference. You can make reasonable
assumptions based on the agreement you choose.

We're more interested in understanding your approach, reasoning, and how you would tackle the
problem than in the specific contract you select.
