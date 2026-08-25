from setuptools import find_packages, setup

setup(
    name="browsermulti",
    version="152.0.7977.54",
    packages=find_packages(),
    install_requires=["playwright>=1.40.0"],
    author="DungDT293",
    description="BrowserMulti Custom Chromium Automation SDK for Playwright",
    python_requires=">=3.8",
)
