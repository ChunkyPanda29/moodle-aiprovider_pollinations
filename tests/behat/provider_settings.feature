@aiprovider @aiprovider_pollinations
Feature: Pollinations AI provider smoke test
  In order to ensure the plugin doesn't break the site
  As an administrator
  I need basic site functionality to work

  Background:
    Given I log in as "admin"

  Scenario: Dashboard loads with plugin installed
    When I follow "Site home"
    Then I should see "Moodle"
