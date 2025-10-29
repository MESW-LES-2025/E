#!/bin/bash

## Exit shell script on any error
set -e

## Define colors
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No color

VENV_NAME="venv"

## Backend
echo -e "${RED}Setting up the backend...${NC}"
cd backend

python -m venv "$VENV_NAME"

# Activate the virtual environment based on the OS
if [ -f "$VENV_NAME/Scripts/activate" ]; then
    source "$VENV_NAME/Scripts/activate"  # Windows
elif [ -f "$VENV_NAME/bin/activate" ]; then
    source "$VENV_NAME/bin/activate"  # Linux/MacOS
else
    echo -e "${RED}Error: Unable to find the activation script in '$VENV_NAME'.${NC}" >&2
    exit 1
fi

pip install -r requirements.txt
deactivate

cd ..

## Setup frontend
echo -e "${RED}Setting up the frontend...${NC}"
cd frontend

if [ ! -f .env ]; then
    cp .env.example .env
fi

npm install
cd ..

## Initialize Husky
echo -e "${RED}Initializing Husky...${NC}"
npx husky install


echo -e "${GREEN}Setup completed successfully!${NC}"