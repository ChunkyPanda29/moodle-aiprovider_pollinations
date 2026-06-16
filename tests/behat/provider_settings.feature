@aiprovider @aiprovider_pollinations
Feature: Pollinations AI provider settings
  In order to use the Pollinations AI provider
  As an administrator
  I need the plugin to be installed and accessible

  Background:
    Given I log in as "admin"

  Scenario: Navigate to AI provider settings
    When I navigate to "Plugins > AI providers" in site administration
    Then I should see "Pollinations"

  Scenario: View Pollinations connection settings
    When I navigate to "Plugins > AI providers" in site administration
    And I follow "Pollinations AI provider"
    Then I should see "Rate limiting"
    And I should see "Content safety"
