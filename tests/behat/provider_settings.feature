@aiprovider @aiprovider_pollinations
Feature: Pollinations AI provider smoke test
  In order to ensure the plugin doesn't break the site
  As an administrator
  I need basic site functionality to work

  Scenario: Admin login succeeds with plugin installed
    Given I log in as "admin"
    Then I should see "Admin"
