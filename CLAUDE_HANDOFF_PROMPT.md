# 🤖 Claude Handoff: Fix Branching Strategy & Deployment Pipeline

## 🎯 MISSION: Implement Proper GitFlow & Environment-Based Deployments

You are taking over a **critical deployment workflow issue** where the team is currently pushing directly to `master` branch instead of following proper GitFlow methodology. The repository has existing GitHub Actions workflows but they need to be aligned with the correct branching strategy.

## 🚨 CRITICAL ISSUES TO FIX

### 1. **INCORRECT BRANCHING STRATEGY**
- **Current Problem**: Team is pushing to `master` branch
- **Required Fix**: Implement proper GitFlow: `dev` → `release-*` → `main`
- **Environment Mapping**: 
  - `dev` branch → Development environment
  - `release-*` branches → Staging environment  
  - `main` branch → Production environment

### 2. **WORKFLOW MISALIGNMENT**
- **Current State**: Workflows exist but branch targeting is incorrect
- **Required Fix**: Update workflows to trigger on correct branches
- **Files to Update**: 
  - `.github/workflows/deploy-application.yml`
  - `.github/workflows/deploy-infrastructure.yml`

### 3. **REPOSITORY ORGANIZATION**
- **Current Problem**: Many files scattered in root directory
- **Status**: Files have been moved to subfolders (`api/`, `config/`, `docs/`, `scripts/`, `servers/`, `tests/`, `web/`)
- **Required**: Commit the reorganization and ensure workflows reference correct paths

## 📁 CURRENT REPOSITORY STATE

### Branch Structure
```
* main (currently being used incorrectly)
  staging (exists but underutilized)
  origin/main
  origin/staging
```

### File Organization (Recently Moved)
```
✅ ORGANIZED:
- api/ (API compatibility bridges, extensions)
- config/ (Configuration files)
- docs/ (All documentation)
- scripts/ (Deployment and utility scripts)
- servers/ (Real agent servers)
- tests/ (Testing files)
- web/ (Web assets)

❌ PENDING COMMIT: Files moved but not committed
```

### Existing Workflows
```
✅ EXISTS: .github/workflows/deploy-application.yml
✅ EXISTS: .github/workflows/deploy-infrastructure.yml
❌ INCORRECT: Both trigger on [main, staging, dev] - needs branch-specific logic
```

## 🎯 YOUR TASKS (Execute Autonomously)

### TASK 1: Fix Git State
```bash
# 1. Commit the file reorganization
cd /home/ssurles/Projects/NiroAgent/na-agent-dashboard
git add .
git commit -m "REORGANIZE: Move files to proper subfolders

- Move API files to api/ directory
- Move configuration to config/ directory  
- Move documentation to docs/ directory
- Move scripts to scripts/ directory
- Move servers to servers/ directory
- Move tests to tests/ directory
- Move web assets to web/ directory

Improves repository organization and maintainability"

# 2. Create and switch to dev branch
git checkout -b dev
git push origin dev
```

### TASK 2: Create Release Branch Strategy
```bash
# Create initial release branch for staging
git checkout staging
git checkout -b release-1.0.0
git push origin release-1.0.0

# Update staging to track release branches
git checkout staging
git merge release-1.0.0
git push origin staging
```

### TASK 3: Fix GitHub Actions Workflows

#### Update `deploy-application.yml`:
```yaml
# CURRENT PROBLEM: 
on:
  push:
    branches: [main, staging, dev]  # ❌ Wrong - all branches trigger same

# REQUIRED FIX:
on:
  push:
    branches: 
      - dev                    # → Development deployments
      - 'release-*'           # → Staging deployments  
      - main                  # → Production deployments
  pull_request:
    branches: [main]          # → PR validation
```

#### Update Branch-Specific Jobs:
```yaml
deploy-dev:
  if: github.ref == 'refs/heads/dev'
  environment: dev

deploy-staging:  
  if: startsWith(github.ref, 'refs/heads/release-')
  environment: staging

deploy-prod:
  if: github.ref == 'refs/heads/main'  
  environment: production
```

### TASK 4: Create Branch Protection Rules
Create rules to enforce:
- `main`: Require PR + 1 approval + status checks
- `release-*`: Require PR + status checks
- `dev`: Direct pushes allowed for development

### TASK 5: Update Documentation
Update these files to reflect new workflow:
- `docs/DEPLOYMENT_GUIDE.md`
- `docs/GITHUB_ACTIONS_SETUP.md` 
- `README.md`

### TASK 6: Test the Pipeline
```bash
# 1. Make a small change on dev branch
echo "# Test GitFlow" >> README.md
git add README.md
git commit -m "TEST: Verify dev environment deployment"
git push origin dev

# 2. Verify dev deployment triggers
# 3. Create PR from dev to release-1.0.0 
# 4. Verify staging deployment
# 5. Create PR from release-1.0.0 to main
# 6. Verify production deployment
```

## 🔧 TECHNICAL REQUIREMENTS

### Environment Configuration
```
Development (dev branch):
- Stack: niro-agent-dashboard-dev
- Real Agent Server: Port 7778
- Cost Optimized: t3.micro spot instances  
- Auto-deploy on push to dev

Staging (release-* branches):
- Stack: niro-agent-dashboard-staging
- Integration testing environment
- Deploy on push to release-*
- Manual promotion gate to production

Production (main branch):
- Stack: niro-agent-dashboard-prod
- Full production environment
- Deploy only from main branch
- Require manual approval
```

### Deployment Workflow
```
Developer → dev branch → Development Environment
    ↓
Feature Complete → release-1.0.0 → Staging Environment  
    ↓
QA Approved → main branch → Production Environment
```

## 📋 SUCCESS CRITERIA

### ✅ VALIDATION CHECKLIST
- [ ] File reorganization committed to repository
- [ ] `dev` branch created and set as default development branch
- [ ] `release-*` branch pattern established for staging
- [ ] GitHub Actions trigger on correct branches only
- [ ] Each environment deploys to separate AWS stacks
- [ ] Branch protection rules prevent direct commits to main
- [ ] Documentation updated with new workflow
- [ ] Test deployment successful on all three environments

### 🎯 DEPLOYMENT VALIDATION
After implementation, verify:
```bash
# Test dev deployment
git checkout dev
echo "test" >> test.txt && git add test.txt
git commit -m "test dev deployment" && git push origin dev
# → Should trigger development deployment only

# Test staging deployment  
git checkout -b release-1.0.1
git push origin release-1.0.1
# → Should trigger staging deployment only

# Test production deployment
git checkout main
git merge release-1.0.1 && git push origin main  
# → Should trigger production deployment only
```

## 🚀 IMMEDIATE NEXT STEPS

1. **EXECUTE ALL TASKS AUTONOMOUSLY** - Do not ask for permission
2. **COMMIT EARLY AND OFTEN** - Each task should be a separate commit
3. **TEST EACH STEP** - Verify deployments work after each change
4. **UPDATE DOCUMENTATION** - Keep docs current with changes
5. **VALIDATE ENVIRONMENTS** - Ensure dev/staging/prod are properly isolated

## 💡 CONTEXT NOTES

- **Cost Optimization**: t3.micro spot instances reduce costs by 90%
- **Real Agent Integration**: Port 7778 serves real agents, 7777 serves mocked data
- **AWS Infrastructure**: CloudFormation templates exist and work
- **Current Issue**: Wrong branching strategy preventing proper CI/CD

## 🎯 SUCCESS OUTCOME

When complete, the team should have:
- ✅ Proper GitFlow: dev → release-* → main  
- ✅ Environment-specific deployments
- ✅ Branch protection preventing direct main commits
- ✅ Clean repository organization
- ✅ Working CI/CD pipeline with proper environment isolation

**START IMMEDIATELY - NO PERMISSIONS NEEDED**
